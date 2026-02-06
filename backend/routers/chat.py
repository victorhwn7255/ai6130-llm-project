"""Main chat endpoint with SSE streaming and routing."""
import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from schemas.api import ChatRequest, Route
from services.router_model import get_router
from services.ollama_client import get_ollama
from services.openai_client import get_openai
from db.database import get_db
from db.models import RoutingLog
import sys
sys.path.insert(0, ".")
from utils.cost_model import compute_cost

router = APIRouter()


@router.post("/api/chat")
async def chat(request: ChatRequest):
    """Non-streaming chat with routing."""
    rt = get_router()

    # Handle force_route override
    if request.force_route is not None:
        from schemas.api import RoutingDecision
        from services.feature_extractor import extract_features
        import time
        start = time.perf_counter()
        features = extract_features(request.message)
        decision = RoutingDecision(
            route=request.force_route,
            confidence=1.0,
            features=features,
            router_latency_ms=(time.perf_counter() - start) * 1000,
        )
    else:
        decision = rt.predict(request.message, threshold=request.threshold)

    if decision.route == Route.LOCAL:
        result = await get_ollama().generate(request.message)
    else:
        result = await get_openai().generate(request.message)

    cost = compute_cost(
        route=decision.route,
        input_tokens=result["input_tokens"],
        output_tokens=result["output_tokens"],
    )
    cloud_cost = compute_cost(
        route=Route.CLOUD,
        input_tokens=result["input_tokens"],
        output_tokens=result["output_tokens"],
    )

    # Log to database
    async with get_db() as db:
        log = RoutingLog(
            query=request.message,
            route=decision.route.value,
            confidence=decision.confidence,
            features=decision.features,
            response_text=result["text"],
            latency_ms=result["latency_ms"],
            router_latency_ms=decision.router_latency_ms,
            input_tokens=result["input_tokens"],
            output_tokens=result["output_tokens"],
            cost_usd=cost,
            cloud_cost_usd=cloud_cost,
            savings_usd=cloud_cost - cost,
            domain=decision.features.get("domain", "general"),
        )
        db.add(log)

    return {
        "response": result["text"],
        "routing": decision.model_dump(),
        "latency_ms": result["latency_ms"],
        "token_count": result["output_tokens"],
        "cost_usd": cost,
    }


@router.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    SSE streaming chat with routing.

    Note: The streaming endpoint does not log to the database.
    This is acceptable for the demo. Full logging would require
    accumulating the streamed response and token counts.
    """
    rt = get_router()
    decision = rt.predict(request.message, threshold=request.threshold)

    async def event_generator():
        # Send routing decision first
        yield {
            "event": "routing",
            "data": json.dumps(decision.model_dump()),
        }

        # Stream from chosen model
        full_text = []
        if decision.route == Route.LOCAL:
            gen = get_ollama().stream(request.message)
        else:
            gen = get_openai().stream(request.message)

        async for chunk in gen:
            full_text.append(chunk)
            yield {"event": "token", "data": json.dumps({"text": chunk})}

        # Send completion event
        yield {
            "event": "done",
            "data": json.dumps({"full_text": "".join(full_text)}),
        }

    return EventSourceResponse(event_generator())

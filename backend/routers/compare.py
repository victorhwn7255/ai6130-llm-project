"""Compare mode: run both models on the same query, side by side."""
import asyncio
from fastapi import APIRouter
from schemas.api import CompareRequest, CompareResponse
from services.router_model import get_router
from services.ollama_client import get_ollama
from services.openai_client import get_openai
from services.judge import Judge
import sys
sys.path.insert(0, ".")
from utils.cost_model import compute_cost
from schemas.api import Route

router = APIRouter()


@router.post("/api/compare", response_model=CompareResponse)
async def compare(request: CompareRequest):
    """Run query through both models simultaneously, return side-by-side."""
    rt = get_router()
    decision = rt.predict(request.message)

    # Run both models in parallel
    local_task = asyncio.create_task(get_ollama().generate(request.message))
    cloud_task = asyncio.create_task(get_openai().generate(request.message))
    local_result, cloud_result = await asyncio.gather(local_task, cloud_task)

    # Judge both responses with reasoning
    judge = Judge()
    local_judge_task = asyncio.create_task(
        judge.score_with_reasoning(request.message, local_result["text"])
    )
    cloud_judge_task = asyncio.create_task(
        judge.score_with_reasoning(request.message, cloud_result["text"])
    )
    local_judge, cloud_judge = await asyncio.gather(local_judge_task, cloud_judge_task)

    # Combine reasoning from both judgments
    judge_reasoning = f"Local model: {local_judge.get('reasoning', 'N/A')}\n\nCloud model: {cloud_judge.get('reasoning', 'N/A')}"

    return CompareResponse(
        query=request.message,
        local_response=local_result["text"],
        cloud_response=cloud_result["text"],
        local_score=local_judge.get("score", 0.0),
        cloud_score=cloud_judge.get("score", 0.0),
        local_latency_ms=local_result["latency_ms"],
        cloud_latency_ms=cloud_result["latency_ms"],
        local_tokens=local_result.get("output_tokens", 0),
        cloud_tokens=cloud_result.get("output_tokens", 0),
        judge_reasoning=judge_reasoning,
    )

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Route(str, Enum):
    LOCAL = "local"
    CLOUD = "cloud"


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    threshold: Optional[float] = None  # override default
    force_route: Optional[Route] = None  # force local or cloud


class RoutingDecision(BaseModel):
    route: Route
    confidence: float
    features: dict
    router_latency_ms: float


class ChatResponse(BaseModel):
    response: str
    routing: RoutingDecision
    latency_ms: float
    token_count: int
    cost_usd: float


class CompareRequest(BaseModel):
    message: str


class CompareResponse(BaseModel):
    """Response from /api/compare - matches frontend CompareResponse type."""
    query: str
    local_response: str
    cloud_response: str
    local_score: float
    cloud_score: float
    local_latency_ms: float
    cloud_latency_ms: float
    local_tokens: int
    cloud_tokens: int
    judge_reasoning: str


class DomainBreakdown(BaseModel):
    local: int
    cloud: int


class RoutingLogEntry(BaseModel):
    id: int
    query: str
    route: str
    confidence: float
    domain: str
    latency_ms: float
    cost_usd: float
    timestamp: str


class MetricsSummary(BaseModel):
    """Metrics summary - matches frontend MetricsSummary type."""
    total_queries: int
    local_count: int
    cloud_count: int
    total_cost: float
    total_saved: float
    avg_router_latency_ms: float
    domain_breakdown: dict  # Record<string, {local: number, cloud: number}>
    recent_history: list  # RoutingLogEntry[]


class ParetoPoint(BaseModel):
    threshold: float
    quality: float
    cost_pct: float
    local_pct: float
    pgr: float


class ParetoData(BaseModel):
    """Pareto curve data - matches frontend ParetoData type."""
    sweep: list  # ParetoPoint[]
    cloud_quality: Optional[float]
    local_quality: Optional[float]
    recommended_threshold: float

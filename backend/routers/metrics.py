"""Dashboard metrics and Pareto curve data."""
import json
from pathlib import Path
from fastapi import APIRouter, Query
from sqlalchemy import select, func
from db.database import get_db
from db.models import RoutingLog

router = APIRouter()


@router.get("/api/metrics")
async def get_metrics(limit: int = Query(100, le=500), offset: int = Query(0)):
    """Aggregated metrics for the dashboard - matches frontend MetricsSummary type."""
    async with get_db() as db:
        total = await db.scalar(select(func.count(RoutingLog.id))) or 0
        if total == 0:
            return {
                "total_queries": 0,
                "local_count": 0,
                "cloud_count": 0,
                "total_cost": 0.0,
                "total_saved": 0.0,
                "avg_router_latency_ms": 0.0,
                "domain_breakdown": {},
                "recent_history": [],
            }

        local_count = await db.scalar(
            select(func.count(RoutingLog.id)).where(RoutingLog.route == "local")
        ) or 0

        total_cost = await db.scalar(select(func.sum(RoutingLog.cost_usd))) or 0.0
        total_savings = await db.scalar(select(func.sum(RoutingLog.savings_usd))) or 0.0
        avg_router_lat = await db.scalar(select(func.avg(RoutingLog.router_latency_ms))) or 0.0

        # Per-domain breakdown: Record<string, {local: number, cloud: number}>
        domains = await db.execute(
            select(
                RoutingLog.domain,
                RoutingLog.route,
                func.count(RoutingLog.id).label("count"),
            ).group_by(RoutingLog.domain, RoutingLog.route)
        )
        domain_breakdown = {}
        for domain, route, count in domains.all():
            if domain not in domain_breakdown:
                domain_breakdown[domain] = {"local": 0, "cloud": 0}
            domain_breakdown[domain][route] = count

        # Recent history
        history = await db.execute(
            select(RoutingLog).order_by(RoutingLog.created_at.desc()).limit(limit).offset(offset)
        )
        logs = history.scalars().all()

    return {
        "total_queries": total,
        "local_count": local_count,
        "cloud_count": total - local_count,
        "total_cost": round(total_cost, 6),
        "total_saved": round(total_savings, 6),
        "avg_router_latency_ms": round(avg_router_lat, 2),
        "domain_breakdown": domain_breakdown,
        "recent_history": [
            {
                "id": log.id,
                "query": log.query[:100],
                "route": log.route,
                "confidence": log.confidence,
                "domain": log.domain,
                "latency_ms": log.latency_ms,
                "cost_usd": log.cost_usd,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


@router.get("/api/metrics/pareto")
async def get_pareto_data():
    """
    Fix 9: Pareto curve data endpoint - matches frontend ParetoData type.

    Reads pre-computed evaluation results from data/results/evaluation_results.json
    and returns the pareto_sweep array along with cloud_quality and local_quality baselines.
    If the file doesn't exist (evaluation hasn't been run), returns null data.
    """
    results_path = Path("data/results/evaluation_results.json")

    if not results_path.exists():
        # Return null-like structure that frontend handles gracefully
        return {
            "sweep": [],
            "cloud_quality": None,
            "local_quality": None,
            "recommended_threshold": 0.6,
        }

    try:
        with open(results_path) as f:
            results = json.load(f)

        # Load baseline scores for reference lines
        local_scores_path = Path("data/results/mtbench_local_scores.json")
        cloud_scores_path = Path("data/results/mtbench_cloud_scores.json")

        cloud_quality = None
        local_quality = None

        if local_scores_path.exists():
            with open(local_scores_path) as f:
                local_scores = json.load(f)
                local_quality = sum(local_scores) / len(local_scores) if local_scores else None

        if cloud_scores_path.exists():
            with open(cloud_scores_path) as f:
                cloud_scores = json.load(f)
                cloud_quality = sum(cloud_scores) / len(cloud_scores) if cloud_scores else None

        return {
            "sweep": results.get("pareto_sweep", []),
            "cloud_quality": cloud_quality,
            "local_quality": local_quality,
            "recommended_threshold": results.get("threshold", 0.6),
        }
    except json.JSONDecodeError:
        return {
            "sweep": [],
            "cloud_quality": None,
            "local_quality": None,
            "recommended_threshold": 0.6,
        }

"""
E6: Extract and annotate routing error cases for the report.

Reads evaluation results, finds:
- False positives: routed locally but local quality was poor (quality gap >= 2.0)
- False negatives: routed to cloud but local could have handled it (enhancement)

Enhancement (per prompt.md): Also identifies top 3 false negatives to show
the router's conservatism, not just its failures.

Usage:
  python scripts/eval_error_analysis.py
"""
import json
from pathlib import Path

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.services.router_model import RouterModel


def _classify_failure(question, features, gap):
    """Heuristic classification of why the router failed."""
    if features.get("has_code"):
        return "Code query misclassified as simple — local model lacks code reasoning"
    if features.get("has_math"):
        return "Math query misclassified — local model insufficient for symbolic reasoning"
    if features.get("reasoning_depth", 0) >= 2:
        return "Multi-step reasoning underestimated by surface features"
    if features.get("token_count", 0) < 15:
        return "Short query masked underlying complexity"
    if gap >= 4.0:
        return "Severe quality gap — query requires capabilities absent in local model"
    return "Ambiguous difficulty — confidence score was borderline"


def _classify_false_negative(question, features, local_score, cloud_score):
    """Heuristic classification of why the router was overly conservative."""
    if features.get("is_creative"):
        return "Creative query unnecessarily sent to cloud — local model is sufficient for creative tasks"
    if features.get("is_factual"):
        return "Simple factual query routed to cloud — local model handles basic facts well"
    if features.get("token_count", 0) < 20:
        return "Short simple query over-routed — complexity overestimated"
    if local_score >= 8.0:
        return "High-quality local response available — router was too conservative"
    return "Router conservatism — local model could have handled this query"


def main():
    # Check if required files exist
    required_files = [
        "data/results/mtbench_questions.json",
        "data/results/mtbench_local_scores.json",
        "data/results/mtbench_cloud_scores.json",
    ]
    for f in required_files:
        if not Path(f).exists():
            print(f"ERROR: Required file not found: {f}")
            print("Run: python scripts/eval_baselines.py first")
            return

    # Load MT-Bench data
    with open("data/results/mtbench_questions.json") as f:
        questions = json.load(f)
    with open("data/results/mtbench_local_scores.json") as f:
        local_scores = json.load(f)
    with open("data/results/mtbench_cloud_scores.json") as f:
        cloud_scores = json.load(f)

    # Load evaluation results to get the threshold
    threshold = 0.6  # default
    eval_results_path = Path("data/results/evaluation_results.json")
    if eval_results_path.exists():
        with open(eval_results_path) as f:
            eval_results = json.load(f)
        threshold = eval_results.get("threshold", 0.6)

    router = RouterModel()
    print(f"Analyzing errors at threshold: {threshold}")

    false_positives = []
    false_negatives = []

    for i, q in enumerate(questions):
        decision = router.predict(q["query"], threshold=threshold)
        is_local = decision.route.value == "local"
        quality_gap = cloud_scores[i] - local_scores[i]

        # False positive: routed locally but local quality is significantly worse
        if is_local and quality_gap >= 2.0:
            false_positives.append({
                "rank": 0,  # filled later
                "question_id": q.get("question_id", i),
                "category": q.get("category", "unknown"),
                "query": q["query"],
                "router_decision": "local",
                "router_confidence": decision.confidence,
                "local_score": local_scores[i],
                "cloud_score": cloud_scores[i],
                "quality_gap": quality_gap,
                "local_response": q.get("local_response", ""),
                "cloud_response": q.get("cloud_response", ""),
                "domain_features": decision.features,
                "failure_reason": _classify_failure(q, decision.features, quality_gap),
            })

        # False negative (enhancement): routed to cloud but local could have handled it
        # Condition: local_score >= cloud_score - 0.5 AND routed to cloud
        if not is_local and local_scores[i] >= cloud_scores[i] - 0.5:
            false_negatives.append({
                "rank": 0,  # filled later
                "question_id": q.get("question_id", i),
                "category": q.get("category", "unknown"),
                "query": q["query"],
                "router_decision": "cloud",
                "router_confidence": decision.confidence,
                "local_score": local_scores[i],
                "cloud_score": cloud_scores[i],
                "quality_gap": quality_gap,
                "local_response": q.get("local_response", ""),
                "cloud_response": q.get("cloud_response", ""),
                "domain_features": decision.features,
                "failure_reason": _classify_false_negative(
                    q, decision.features, local_scores[i], cloud_scores[i]
                ),
            })

    # Sort false positives by severity (largest quality gap first)
    false_positives.sort(key=lambda x: x["quality_gap"], reverse=True)
    for i, e in enumerate(false_positives):
        e["rank"] = i + 1

    # Sort false negatives by local score (best local performance first)
    false_negatives.sort(key=lambda x: x["local_score"], reverse=True)
    for i, e in enumerate(false_negatives):
        e["rank"] = i + 1

    # Take top 8 false positives and top 3 false negatives
    top_false_positives = false_positives[:8]
    top_false_negatives = false_negatives[:3]

    print(f"\n=== False Positives (routed local, gap >= 2.0) ===")
    print(f"Found {len(false_positives)} total, showing top {len(top_false_positives)}")
    for e in top_false_positives:
        print(f"\n#{e['rank']} [{e['category']}] Gap: {e['quality_gap']:.1f}")
        print(f"  Query: {e['query'][:80]}...")
        print(f"  Confidence: {e['router_confidence']:.2f} | Local: {e['local_score']:.0f} | Cloud: {e['cloud_score']:.0f}")
        print(f"  Failure: {e['failure_reason']}")

    print(f"\n=== False Negatives (routed cloud, local was sufficient) ===")
    print(f"Found {len(false_negatives)} total, showing top {len(top_false_negatives)}")
    for e in top_false_negatives:
        print(f"\n#{e['rank']} [{e['category']}] Local: {e['local_score']:.0f}, Cloud: {e['cloud_score']:.0f}")
        print(f"  Query: {e['query'][:80]}...")
        print(f"  Confidence: {e['router_confidence']:.2f}")
        print(f"  Reason: {e['failure_reason']}")

    # Save results
    output = {
        "threshold": threshold,
        "false_positives": {
            "total_count": len(false_positives),
            "top_cases": top_false_positives,
        },
        "false_negatives": {
            "total_count": len(false_negatives),
            "top_cases": top_false_negatives,
        },
        "summary": {
            "false_positive_rate": len(false_positives) / len(questions) * 100,
            "false_negative_rate": len(false_negatives) / len(questions) * 100,
        }
    }

    Path("data/results").mkdir(parents=True, exist_ok=True)
    with open("data/results/error_analysis.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n=== Summary ===")
    print(f"False positive rate: {output['summary']['false_positive_rate']:.1f}%")
    print(f"False negative rate: {output['summary']['false_negative_rate']:.1f}%")
    print(f"\nSaved to data/results/error_analysis.json")


if __name__ == "__main__":
    main()

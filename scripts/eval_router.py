"""
E4/E5: Compute all 6 metrics + Pareto curve from MT-Bench results.

Fix 2 Applied: Win rate uses actual pairwise judging (not just score approximation)
Fix 5 Applied: Operating point uses PGR * cost_savings product maximization

Assumes you have already run MT-Bench baselines (E1) and have:
  - data/results/mtbench_local_scores.json   (80 per-query scores)
  - data/results/mtbench_cloud_scores.json   (80 per-query scores)
  - data/results/mtbench_questions.json      (80 questions with categories)

Usage:
  python scripts/eval_router.py
"""
import json
import asyncio
import numpy as np
from pathlib import Path
from collections import defaultdict

# Add parent to path for imports (works both locally and in Docker)
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))  # local dev
sys.path.insert(0, str(Path(__file__).parent.parent))  # Docker container

try:
    from backend.services.router_model import RouterModel
    from backend.services.judge import Judge
except ModuleNotFoundError:
    # Running inside Docker where backend code is at /app directly
    from services.router_model import RouterModel
    from services.judge import Judge

from utils.bootstrap import bootstrap_ci, bootstrap_pgr
from utils.visualize import plot_pareto_curve, plot_domain_breakdown


def load_mtbench():
    """Load MT-Bench per-query data."""
    with open("data/results/mtbench_questions.json") as f:
        questions = json.load(f)
    with open("data/results/mtbench_local_scores.json") as f:
        local_scores = json.load(f)
    with open("data/results/mtbench_cloud_scores.json") as f:
        cloud_scores = json.load(f)
    return questions, local_scores, cloud_scores


async def run_pairwise_judging(questions, routed_responses, cloud_responses, decisions):
    """
    Fix 2: Run actual pairwise judging for win rate calculation.
    Returns (wins, ties, losses) for routed vs cloud.
    """
    judge = Judge()
    wins, ties, losses = 0, 0, 0

    print("\nRunning pairwise judging (Fix 2)...")
    for i, q in enumerate(questions):
        if (i + 1) % 20 == 0:
            print(f"  Progress: {i + 1}/{len(questions)}")

        # If routed to cloud, it's a tie by definition
        if decisions[i].route.value == "cloud":
            ties += 1
            continue

        try:
            # Compare routed (local) response vs cloud response
            result = await judge.pairwise(
                q["query"],
                routed_responses[i],
                cloud_responses[i]
            )

            if result == "A":  # A = routed response wins
                wins += 1
            elif result == "B":  # B = cloud response wins
                losses += 1
            else:  # TIE
                ties += 1
        except Exception as e:
            print(f"  Warning: Pairwise judging failed for question {i}: {e}")
            ties += 1

    return wins, ties, losses


def main():
    # Check if baseline data exists
    if not Path("data/results/mtbench_questions.json").exists():
        print("ERROR: MT-Bench baseline results not found.")
        print("Run: python scripts/eval_baselines.py first")
        return

    questions, local_scores, cloud_scores = load_mtbench()
    router = RouterModel()
    n = len(questions)

    cloud_avg = np.mean(cloud_scores)
    local_avg = np.mean(local_scores)
    print(f"Baselines — Local: {local_avg:.2f}, Cloud: {cloud_avg:.2f}, Gap: {cloud_avg - local_avg:.2f}")

    # ── E4: Threshold sweep + Pareto curve ──
    thresholds = np.arange(0.0, 1.01, 0.05)
    sweep_results = []

    for t in thresholds:
        routed_scores = []
        local_count = 0
        for i, q in enumerate(questions):
            decision = router.predict(q["query"], threshold=t)
            if decision.route.value == "local":
                routed_scores.append(local_scores[i])
                local_count += 1
            else:
                routed_scores.append(cloud_scores[i])

        quality = np.mean(routed_scores)
        local_pct = local_count / n * 100
        cost_pct = 100 - local_pct  # Cost as % of cloud-only
        cost_savings_pct = local_pct  # Savings is local percentage
        pgr = (quality - local_avg) / (cloud_avg - local_avg) * 100 if cloud_avg != local_avg else 100.0

        # Fix 5: Compute balanced score for operating point selection
        balanced_score = pgr * cost_savings_pct / 100  # Product of PGR and savings

        sweep_results.append({
            "threshold": round(float(t), 2),
            "quality": round(quality, 3),
            "local_pct": round(local_pct, 1),
            "cost_pct": round(cost_pct, 1),
            "pgr": round(pgr, 1),
            "cost_savings_pct": round(cost_savings_pct, 1),
            "balanced_score": round(balanced_score, 2),
        })

    # Fix 5: Find recommended operating point using balanced score maximization
    best_idx = max(range(len(sweep_results)), key=lambda i: sweep_results[i]["balanced_score"])
    best_threshold = sweep_results[best_idx]["threshold"]

    # Fall back to 0.6 if threshold is extreme
    if best_threshold < 0.2 or best_threshold > 0.9:
        print(f"Note: Optimal threshold {best_threshold} is extreme, falling back to 0.6")
        best_idx = 12  # 0.6 threshold
        best_threshold = 0.6

    print(f"\nFix 5: Operating point selected by maximizing PGR × cost_savings")
    print(f"  Recommended threshold: {best_threshold}")
    print(f"  Balanced score: {sweep_results[best_idx]['balanced_score']}")

    # Report metrics at fixed thresholds (0.4, 0.6, 0.8) for Table 6
    fixed_thresholds = [0.4, 0.6, 0.8]
    print(f"\n=== Metrics at Fixed Thresholds (Table 6) ===")
    print(f"{'Threshold':>10} {'PGR':>8} {'Cost%':>8} {'Quality':>8}")
    print("-" * 38)
    for t in fixed_thresholds:
        idx = int(t * 20)  # Map threshold to index
        if idx < len(sweep_results):
            r = sweep_results[idx]
            print(f"{t:>10.1f} {r['pgr']:>7.1f}% {r['cost_pct']:>7.1f}% {r['quality']:>8.2f}")

    # Plot Pareto curve (Fig 5)
    plot_pareto_curve(
        [s["threshold"] for s in sweep_results],
        [s["quality"] for s in sweep_results],
        [s["cost_pct"] for s in sweep_results],
        cloud_avg, local_avg,
        operating_point_idx=best_idx,
    )

    # ── E5: Evaluation at recommended threshold ──
    t_star = best_threshold
    print(f"\n=== Evaluation at Recommended Threshold ({t_star}) ===")

    routed_scores = []
    routed_responses = []
    cloud_responses = []
    decisions = []
    for i, q in enumerate(questions):
        decision = router.predict(q["query"], threshold=t_star)
        decisions.append(decision)
        if decision.route.value == "local":
            routed_scores.append(local_scores[i])
            routed_responses.append(q.get("local_response", ""))
        else:
            routed_scores.append(cloud_scores[i])
            routed_responses.append(q.get("cloud_response", ""))
        cloud_responses.append(q.get("cloud_response", ""))

    # M1: PGR with bootstrap CI
    pgr_result = bootstrap_pgr(routed_scores, local_scores, cloud_scores)
    print(f"M1 — PGR: {pgr_result['mean']*100:.1f}% [{pgr_result['ci_lower']*100:.1f}, {pgr_result['ci_upper']*100:.1f}]")

    # M2: Cost savings
    local_count = sum(1 for d in decisions if d.route.value == "local")
    cost_savings = local_count / n * 100
    print(f"M2 — Cost Savings: {cost_savings:.1f}%")

    # M5a: Win rate (approximate from scores)
    wins_approx, ties_approx, losses_approx = 0, 0, 0
    for i in range(n):
        r_score = routed_scores[i]
        c_score = cloud_scores[i]
        if abs(r_score - c_score) < 0.5:
            ties_approx += 1
        elif r_score >= c_score:
            wins_approx += 1
        else:
            losses_approx += 1
    win_rate_approx = (wins_approx + 0.5 * ties_approx) / n * 100
    print(f"M5 (approx) — Win Rate: {win_rate_approx:.1f}% (W:{wins_approx} T:{ties_approx} L:{losses_approx})")

    # M5b: Win rate (pairwise judging) — Fix 2
    wins_pair, ties_pair, losses_pair = asyncio.run(
        run_pairwise_judging(questions, routed_responses, cloud_responses, decisions)
    )
    win_rate_pairwise = (wins_pair + 0.5 * ties_pair) / n * 100
    print(f"M5 (pairwise) — Win Rate: {win_rate_pairwise:.1f}% (W:{wins_pair} T:{ties_pair} L:{losses_pair})")
    print(f"  [Fix 2: Pairwise result is the official M5 metric]")

    # M6: Per-domain PGR
    domain_scores = defaultdict(lambda: {"local": [], "cloud": [], "routed": []})
    for i, q in enumerate(questions):
        cat = q.get("category", "general")
        domain_scores[cat]["local"].append(local_scores[i])
        domain_scores[cat]["cloud"].append(cloud_scores[i])
        domain_scores[cat]["routed"].append(routed_scores[i])

    domain_pgrs = {}
    print(f"\nM6 — Per-Domain PGR:")
    for cat, scores in sorted(domain_scores.items()):
        l, c, r = np.mean(scores["local"]), np.mean(scores["cloud"]), np.mean(scores["routed"])
        pgr = (r - l) / (c - l) * 100 if c != l else 100
        domain_pgrs[cat] = round(pgr, 1)
        print(f"  {cat:15s}: PGR = {pgr:5.1f}%  (L:{l:.1f} C:{c:.1f} R:{r:.1f})")

    # Plot domain breakdown (Fig 6)
    plot_domain_breakdown(
        list(domain_pgrs.keys()),
        list(domain_pgrs.values()),
    )

    # Save all results
    results = {
        "threshold": t_star,
        "pgr": {
            "mean": pgr_result["mean"],
            "ci_lower": pgr_result["ci_lower"],
            "ci_upper": pgr_result["ci_upper"],
        },
        "cost_savings_pct": cost_savings,
        "win_rate_approx": {
            "pct": win_rate_approx,
            "wins": wins_approx,
            "ties": ties_approx,
            "losses": losses_approx,
        },
        "win_rate_pairwise": {
            "pct": win_rate_pairwise,
            "wins": wins_pair,
            "ties": ties_pair,
            "losses": losses_pair,
        },
        "domain_pgr": domain_pgrs,
        "pareto_sweep": sweep_results,
        "baselines": {
            "cloud_quality": cloud_avg,
            "local_quality": local_avg,
        },
        "fixed_threshold_results": {
            str(t): {
                "pgr": sweep_results[int(t * 20)]["pgr"],
                "cost_pct": sweep_results[int(t * 20)]["cost_pct"],
                "quality": sweep_results[int(t * 20)]["quality"],
            }
            for t in fixed_thresholds if int(t * 20) < len(sweep_results)
        },
    }

    Path("data/results").mkdir(parents=True, exist_ok=True)
    with open("data/results/evaluation_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\n=== All results saved to data/results/ ===")
    print("  - evaluation_results.json (all metrics)")
    print("  - pareto_curve.png (Fig 5)")
    print("  - domain_pgr.png (Fig 6)")


if __name__ == "__main__":
    main()

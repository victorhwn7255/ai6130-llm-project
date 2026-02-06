"""
E2: Validate GPT-4 judge against human annotations.

Input: a JSONL file with human_score and query fields.
Computes Spearman ρ between human scores and GPT-4 judge scores.

Pre-requisite: Manually annotate ~100 query-response pairs.
Create a JSONL file at data/judge_validation/human_annotations.jsonl
with entries containing: query, local_response (optional), human_score (1-10)

Usage:
  python scripts/judge_validation.py --annotations data/judge_validation/human_annotations.jsonl
"""
import json
import asyncio
import argparse
from pathlib import Path
from scipy.stats import spearmanr
from sklearn.metrics import cohen_kappa_score

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.services.judge import Judge
from backend.services.ollama_client import OllamaClient


async def main(annotations_path: str):
    judge = Judge()
    ollama = OllamaClient()

    # Check if annotations file exists
    if not Path(annotations_path).exists():
        print(f"ERROR: Annotations file not found at {annotations_path}")
        print("\nTo create annotations:")
        print("1. Create a JSONL file with ~100 entries")
        print("2. Each entry should have: query, human_score (1-10)")
        print("3. Optionally include: local_response (if pre-generated)")
        print("\nExample entry:")
        print('{"query": "What is Python?", "human_score": 8}')
        return

    # Load human annotations
    data = []
    with open(annotations_path) as f:
        for line in f:
            data.append(json.loads(line))

    print(f"Loaded {len(data)} human annotations")

    human_scores = []
    judge_scores = []

    for i, item in enumerate(data):
        query = item["query"]
        human_score = item["human_score"]

        # Get local model response if not cached
        if "local_response" not in item:
            print(f"  [{i+1}/{len(data)}] Generating local response...")
            result = await ollama.generate(query)
            response = result["text"]
        else:
            response = item["local_response"]

        # Get judge score
        print(f"  [{i+1}/{len(data)}] Judging response...")
        j_score = await judge.score(query, response)

        human_scores.append(human_score)
        judge_scores.append(j_score)
        print(f"    Human: {human_score:.0f}  Judge: {j_score:.0f}  Query: {query[:60]}...")

    # Compute Spearman ρ
    rho, p_value = spearmanr(human_scores, judge_scores)
    print(f"\n=== Judge Validation Results ===")
    print(f"Spearman ρ = {rho:.3f} (p = {p_value:.4f})")

    # Binary agreement (threshold = 7)
    human_binary = [1 if s >= 7 else 0 for s in human_scores]
    judge_binary = [1 if s >= 7 else 0 for s in judge_scores]
    kappa = cohen_kappa_score(human_binary, judge_binary)
    print(f"Cohen's κ (binary, threshold=7) = {kappa:.3f}")

    # Agreement statistics
    agreement = sum(1 for h, j in zip(human_binary, judge_binary) if h == j)
    agreement_pct = agreement / len(human_binary) * 100
    print(f"Binary agreement: {agreement}/{len(human_binary)} ({agreement_pct:.1f}%)")

    # Verdict
    print("\n=== Verdict ===")
    if rho >= 0.60:
        print("✓ Judge is reliable (ρ ≥ 0.60). Proceed with training.")
        verdict = "reliable"
    elif rho >= 0.50:
        print("~ Judge is marginally reliable (0.50 ≤ ρ < 0.60). Consider refining judge prompt.")
        verdict = "marginal"
    else:
        print("✗ Judge may be unreliable (ρ < 0.50). Consider refining the judge prompt.")
        verdict = "unreliable"

    # Save results
    results = {
        "spearman_rho": rho,
        "p_value": p_value,
        "cohens_kappa": kappa,
        "binary_agreement_pct": agreement_pct,
        "n": len(data),
        "verdict": verdict,
    }

    Path("data/results").mkdir(parents=True, exist_ok=True)
    with open("data/results/judge_validation.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to data/results/judge_validation.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--annotations", required=True,
                        help="Path to human annotations JSONL file")
    args = parser.parse_args()
    asyncio.run(main(args.annotations))

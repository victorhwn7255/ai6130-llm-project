"""
E1: Run MT-Bench baselines for both models.
Wraps FastChat's gen_model_answer and gen_judge to produce per-query scores.

Fix 7 Applied (Multi-Turn Handling Decision):
We evaluate first turns only (80 questions). Routing decisions are made
per-query, and the router makes a single decision at the start of a
conversation. Multi-turn routing (re-routing mid-conversation or
maintaining model consistency across turns) is noted as future work.
This approach is standard for routing evaluation in the literature.

Usage:
  python scripts/eval_baselines.py
  python scripts/eval_baselines.py --resume  # Resume from existing results
"""
import json
import asyncio
import argparse
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.services.ollama_client import OllamaClient
from backend.services.openai_client import OpenAIClient
from backend.services.judge import Judge

# MT-Bench 80 questions (download from FastChat repo or load local copy)
MTBENCH_PATH = "data/raw/mt_bench_questions.jsonl"


def load_existing_results():
    """Load existing results for resume capability."""
    results_path = Path("data/results/mtbench_questions.json")
    if results_path.exists():
        with open(results_path) as f:
            return json.load(f)
    return []


async def run_baselines(resume: bool = False):
    ollama = OllamaClient()
    openai_client = OpenAIClient()
    judge = Judge()

    # Load MT-Bench questions
    if not Path(MTBENCH_PATH).exists():
        print(f"ERROR: MT-Bench questions not found at {MTBENCH_PATH}")
        print("Download from: https://raw.githubusercontent.com/lm-sys/FastChat/main/fastchat/llm_judge/data/mt_bench/question.jsonl")
        print(f"  wget <url> -O {MTBENCH_PATH}")
        return

    questions = []
    with open(MTBENCH_PATH) as f:
        for line in f:
            questions.append(json.loads(line))
    print(f"Loaded {len(questions)} MT-Bench questions")

    # Resume capability
    existing_results = []
    processed_ids = set()
    if resume:
        existing_results = load_existing_results()
        processed_ids = {r.get("question_id") for r in existing_results}
        print(f"Resuming: {len(processed_ids)} already processed")

    local_scores, cloud_scores = [], []
    results = existing_results.copy()

    # Collect scores from existing results
    for r in existing_results:
        local_scores.append(r["local_score"])
        cloud_scores.append(r["cloud_score"])

    questions_to_process = [q for q in questions if q.get("question_id") not in processed_ids]
    print(f"Processing {len(questions_to_process)} questions...")

    for q in tqdm(questions_to_process, desc="Running baselines"):
        # Fix 7: Use first turn only
        query = q["turns"][0]
        category = q.get("category", "general")
        question_id = q.get("question_id", len(results))

        try:
            # Run both models
            local_result = await ollama.generate(query)
            cloud_result = await openai_client.generate(query)

            # Judge both
            l_score = await judge.score(query, local_result["text"])
            c_score = await judge.score(query, cloud_result["text"])

            local_scores.append(l_score)
            cloud_scores.append(c_score)
            results.append({
                "question_id": question_id,
                "category": category,
                "query": query,
                "local_score": l_score,
                "cloud_score": c_score,
                "local_response": local_result["text"][:500],
                "cloud_response": cloud_result["text"][:500],
                "local_latency_ms": local_result["latency_ms"],
                "cloud_latency_ms": cloud_result["latency_ms"],
            })

            # Checkpoint every 10
            if len(results) % 10 == 0:
                _save_results(results, local_scores, cloud_scores)

        except Exception as e:
            print(f"  Error on question {question_id}: {e}")
            continue

    # Final save
    _save_results(results, local_scores, cloud_scores)

    # Summary
    import numpy as np
    print(f"\n=== Baseline Results ===")
    print(f"  Local avg:  {np.mean(local_scores):.2f}")
    print(f"  Cloud avg:  {np.mean(cloud_scores):.2f}")
    print(f"  Gap:        {np.mean(cloud_scores) - np.mean(local_scores):.2f}")

    # Per-category breakdown
    by_cat = defaultdict(lambda: {"local": [], "cloud": []})
    for r in results:
        by_cat[r["category"]]["local"].append(r["local_score"])
        by_cat[r["category"]]["cloud"].append(r["cloud_score"])

    print(f"\n  {'Category':15s} {'Local':>6s} {'Cloud':>6s} {'Gap':>6s}")
    print(f"  {'-'*37}")
    for cat, scores in sorted(by_cat.items()):
        l, c = np.mean(scores["local"]), np.mean(scores["cloud"])
        print(f"  {cat:15s} {l:6.2f} {c:6.2f} {c-l:6.2f}")

    print(f"\nResults saved to data/results/")


def _save_results(results, local_scores, cloud_scores):
    """Save all results files."""
    out = Path("data/results")
    out.mkdir(parents=True, exist_ok=True)

    with open(out / "mtbench_local_scores.json", "w") as f:
        json.dump(local_scores, f)
    with open(out / "mtbench_cloud_scores.json", "w") as f:
        json.dump(cloud_scores, f)
    with open(out / "mtbench_questions.json", "w") as f:
        json.dump(results, f, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true", help="Resume from existing results")
    args = parser.parse_args()
    asyncio.run(run_baselines(resume=args.resume))

"""
E2/E3: Generate training labels for the router.
For each query: get local response, judge it, produce binary label.

Fix 8 Applied:
- Added --dry-run flag for cost estimation
- Added --judge-model flag for model override
- Added resume capability from existing output file

Usage:
  python scripts/label_data.py --input data/raw/mixinstruct_5k.jsonl \
                                --output data/labeled/train_5k.jsonl \
                                --limit 5000 --dry-run

  python scripts/label_data.py --input data/raw/mixinstruct_5k.jsonl \
                                --output data/labeled/train_5k.jsonl \
                                --limit 5000 --judge-model gpt-4o-mini
"""
import json
import asyncio
import argparse
from pathlib import Path
from tqdm import tqdm

# Add parent to path for imports (works both locally and in Docker)
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))  # local dev
sys.path.insert(0, str(Path(__file__).parent.parent))  # Docker container

try:
    from backend.services.ollama_client import OllamaClient
    from backend.services.judge import Judge
    from backend.config import get_settings
except ModuleNotFoundError:
    # Running inside Docker where backend code is at /app directly
    from services.ollama_client import OllamaClient
    from services.judge import Judge
    from config import get_settings


# Cost estimates per call (tokens estimated)
ESTIMATED_INPUT_TOKENS = 500
ESTIMATED_OUTPUT_TOKENS = 100

# Pricing per 1M tokens
PRICING = {
    "gpt-4": {"input": 30.0, "output": 60.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}


def estimate_cost(num_calls: int, model: str) -> float:
    """Estimate API cost for judge calls."""
    pricing = PRICING.get(model, PRICING["gpt-4o-mini"])
    input_cost = (num_calls * ESTIMATED_INPUT_TOKENS / 1_000_000) * pricing["input"]
    output_cost = (num_calls * ESTIMATED_OUTPUT_TOKENS / 1_000_000) * pricing["output"]
    return input_cost + output_cost


def load_existing_results(output_path: str) -> tuple[list, set]:
    """Load existing results for resume capability."""
    results = []
    processed_queries = set()

    if Path(output_path).exists():
        with open(output_path) as f:
            for line in f:
                try:
                    d = json.loads(line)
                    results.append(d)
                    if "query" in d:
                        processed_queries.add(d["query"])
                except json.JSONDecodeError:
                    continue

    return results, processed_queries


async def label_one(query: str, ollama: OllamaClient, judge: Judge) -> dict:
    """Generate local response, judge it, return labeled example."""
    try:
        local_result = await ollama.generate(query)
        score = await judge.score(query, local_result["text"])
        return {
            "query": query,
            "local_response": local_result["text"],
            "judge_score": score,
            "label": 1 if score >= 7.0 else 0,  # 1 = local sufficient
            "latency_ms": local_result["latency_ms"],
        }
    except Exception as e:
        return {"query": query, "error": str(e)}


async def main(input_path: str, output_path: str, limit: int, batch_size: int = 5,
               dry_run: bool = False, judge_model: str = None):

    # Determine judge model
    settings = get_settings()
    model = judge_model or settings.judge_model

    # Load queries
    queries = []
    with open(input_path) as f:
        for line in f:
            data = json.loads(line)
            queries.append(data.get("instruction", data.get("query", data.get("input", ""))))
            if len(queries) >= limit:
                break

    # Load existing results for resume
    existing_results, processed_queries = load_existing_results(output_path)
    queries_to_process = [q for q in queries if q not in processed_queries]

    print(f"Total queries: {len(queries)}")
    print(f"Already processed: {len(processed_queries)}")
    print(f"Remaining: {len(queries_to_process)}")
    print(f"Judge model: {model}")

    # Dry run: estimate costs and exit
    if dry_run:
        print("\n=== DRY RUN: Cost Estimation ===")
        num_calls = len(queries_to_process)

        for m in ["gpt-4o-mini", "gpt-4"]:
            cost = estimate_cost(num_calls, m)
            print(f"  {m}: ~${cost:.2f} for {num_calls} judge calls")

        print(f"\nEstimate based on ~{ESTIMATED_INPUT_TOKENS} input + ~{ESTIMATED_OUTPUT_TOKENS} output tokens per call")
        print("Add --judge-model gpt-4o-mini to use the cheaper model")
        print("\nTo proceed, remove --dry-run flag")
        return

    if len(queries_to_process) == 0:
        print("All queries already processed. Nothing to do.")
        return

    # Confirm before proceeding (skip if --yes flag is set)
    cost_estimate = estimate_cost(len(queries_to_process), model)
    print(f"\nEstimated cost: ~${cost_estimate:.2f}")

    # Initialize clients
    ollama = OllamaClient()
    judge = Judge()
    # Override judge model if specified
    if judge_model:
        judge.judge_model = judge_model

    print(f"\nLabeling {len(queries_to_process)} queries (batch size: {batch_size})")

    # Process in batches (avoid OOM on GPU)
    results = existing_results.copy()
    for i in tqdm(range(0, len(queries_to_process), batch_size)):
        batch = queries_to_process[i:i + batch_size]
        tasks = [label_one(q, ollama, judge) for q in batch]
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)

        # Checkpoint every 500
        if len(results) % 500 < batch_size:
            _save(results, output_path)

    _save(results, output_path)
    valid = [r for r in results if "error" not in r]
    local_pct = sum(1 for r in valid if r["label"] == 1) / len(valid) * 100 if valid else 0
    print(f"Done: {len(valid)} labeled ({local_pct:.0f}% local-sufficient)")


def _save(results, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        for r in results:
            f.write(json.dumps(r) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Label training data for router")
    parser.add_argument("--input", required=True, help="Input JSONL file path")
    parser.add_argument("--output", required=True, help="Output JSONL file path")
    parser.add_argument("--limit", type=int, default=5000, help="Max queries to process")
    parser.add_argument("--batch-size", type=int, default=5, help="Batch size for parallel processing")
    parser.add_argument("--dry-run", action="store_true", help="Estimate cost without running")
    parser.add_argument("--judge-model", type=str, default=None,
                        help="Override judge model (default: from .env)")
    args = parser.parse_args()
    asyncio.run(main(args.input, args.output, args.limit, args.batch_size,
                     args.dry_run, args.judge_model))

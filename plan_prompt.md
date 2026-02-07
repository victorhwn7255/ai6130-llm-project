# Claude Code — Hybrid LLM Router: Next Steps

## Project Context

You are helping with a **Hybrid LLM Router** project for NTU's AI6130 Large Language Models course. The system intelligently routes queries between a local edge LLM and a cloud LLM to optimize cost-quality tradeoffs. The goal is to complete the full pipeline as efficiently as possible and achieve the strongest experimental results.

### Architecture

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS 4 + Recharts (running locally via `npm run dev` on port 3000)
- **Backend:** FastAPI (running in Docker on port 8080, mapped from internal 8000)
- **Local LLM:** Phi-3 (`phi3:latest`) via Ollama (running natively on host, port 11434)
- **Cloud LLM:** GPT-4o-mini via OpenAI API
- **Router:** DistilBERT binary classifier (NOT YET TRAINED)
- **Database:** SQLite with async SQLAlchemy
- **Judge:** GPT-4o-mini (scores local model responses 1-10)

### Current State — What's Working

- ✅ Ollama serving Phi-3 locally (`ollama serve` running)
- ✅ Backend Docker container running (`docker compose up -d --build`)
- ✅ Frontend running locally (`cd frontend && npm run dev`)
- ✅ Chat UI functional at `http://localhost:3000`
- ✅ Cloud routing works (GPT-4o-mini responds)
- ✅ Health endpoint returns OK at `http://localhost:8080/health`
- ✅ `.env` configured with OpenAI API key, model names, URLs

### Current State — What's NOT Working Yet

- ❌ **DistilBERT router is untrained** — falls back to base `distilbert-base-uncased` which outputs near-random probabilities (~49%), so everything routes to cloud
- ❌ **No labeled training data** exists yet at `data/labeled/`
- ❌ **No baseline evaluation results** exist yet at `data/results/`
- ❌ **Local model (Phi-3) is never used** because the untrained router doesn't know when to route locally

### Key Configuration

```
# .env
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=phi3:latest
CLOUD_MODEL=gpt-4o-mini
JUDGE_MODEL=gpt-4o-mini
ROUTER_MODEL_PATH=data/models/distilbert_router
ROUTING_THRESHOLD=0.6
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### How to Run Commands

The backend runs inside Docker. All scripts must be executed inside the container:

```bash
docker compose exec backend python scripts/<script_name>.py
```

The frontend runs locally outside Docker.

---

## Your Mission

**This prompt is for PLANNING.** Before executing anything, you must:

1. **Read the actual codebase first.** Examine every script in `scripts/`, every service in `backend/services/`, the `docker-compose.yml`, `.env`, and `backend/config.py`. Understand how the pieces connect.
2. **Identify gaps.** Check what files/data already exist vs what's missing. Look for potential issues — missing dependencies, incorrect paths, import errors, hardcoded values that don't match our config.
3. **Produce a detailed plan.** Break the work into phases and steps. For each step, specify: what script runs, what it depends on, what it produces, estimated cost/time, and how to verify success.
4. **Flag risks and blockers.** If a script references a file that doesn't exist, or imports a module that may not be installed, call it out before we run anything.
5. **Only execute after the user approves the plan.**

Here is the expected pipeline. Review the actual code to confirm it matches, and adjust the plan if the code differs:

### Phase 1: Data Preparation & Baselines

**Step 1: Download MT-Bench questions**

Check if `data/raw/mt_bench_questions.jsonl` exists. If not, download it:

```bash
docker compose exec backend bash -c "mkdir -p data/raw && wget -O data/raw/mt_bench_questions.jsonl https://raw.githubusercontent.com/lm-sys/FastChat/main/fastchat/llm_judge/data/mt_bench/question.jsonl"
```

Verify it has 80 questions.

**Step 2: Run E1 — MT-Bench Baselines**

```bash
docker compose exec backend python scripts/eval_baselines.py
```

This script (`scripts/eval_baselines.py`):
- Loads 80 MT-Bench questions
- Sends each to BOTH Phi-3 (local via Ollama) and GPT-4o-mini (cloud)
- Uses GPT-4o-mini as judge to score both responses (1-10)
- Saves results to `data/results/mtbench_local_scores.json`, `data/results/mtbench_cloud_scores.json`, and `data/results/mtbench_questions.json`
- Supports `--resume` flag if interrupted
- **Estimated cost:** ~$0.40 in OpenAI API calls
- **Estimated time:** 15-30 minutes (depends on Ollama speed)

After completion, verify the output files exist and check average scores for both models.

**Step 3: Run E2 — Judge Validation (optional but recommended)**

```bash
docker compose exec backend python scripts/judge_validation.py
```

Validates that GPT-4o-mini judge produces consistent scores. Saves to `data/results/judge_validation.json`.

### Phase 2: Labeling & Training

**Step 4: Run E3 — Label Training Data**

First, download 18K+ raw queries from MixInstruct and save to `data/raw/mixinstruct_18k.jsonl`:

```python
# Download script (run inside container)
from datasets import load_dataset
import json

ds = load_dataset("llm-blender/mix-instruct", split="train")
queries = [item["input"] for item in ds.select(range(18000))]
with open("data/raw/mixinstruct_18k.jsonl", "w") as f:
    for q in queries:
        f.write(json.dumps({"query": q}) + "\n")
```

Then run the labeling pipeline:

```bash
docker compose exec backend python scripts/label_data.py \
  --input data/raw/mixinstruct_18k.jsonl \
  --output data/labeled/train_18k.jsonl \
  --limit 18000
```

You can first estimate cost without running: add `--dry-run` flag.

This script (`scripts/label_data.py`):
- For each query: sends to Phi-3 (local), then GPT-4o-mini judges the local response quality (1-10)
- Converts to binary labels: score ≥ 7 → "local" (Phi-3 is sufficient), score < 7 → "cloud" (needs GPT-4o-mini)
- Saves labeled data to `data/labeled/train_18k.jsonl`
- Has resume capability — checkpoints every 500 examples, so if interrupted it picks up where it left off
- Supports `--batch-size` flag (default 5) for parallel processing
- **Estimated cost:** ~$6-10 for 18K examples
- **Estimated time:** 6-10 hours (mostly waiting on Ollama + OpenAI API calls, not compute-intensive)

Check that the output file exists and has a reasonable class balance. Target: 18K examples with ~14.4K train / 1.8K val / 1.8K test after splitting.

**Step 5: Run E3 — Train DistilBERT Router**

```bash
docker compose exec backend python scripts/train_router.py --data data/labeled/train_18k.jsonl --output data/models/distilbert_router
```

This script (`scripts/train_router.py`):
- Loads labeled data, splits 80/10/10 (train/val/test)
- Fine-tunes `distilbert-base-uncased` for binary classification (local=0, cloud=1)
- Uses HuggingFace Trainer with early stopping
- Saves model to `data/models/distilbert_router/`
- Saves test metrics to `data/results/router_accuracy.json`
- **Target:** >70% accuracy, good F1 score

**Step 6: Train Feature-Only Router (ablation baseline)**

```bash
docker compose exec backend python scripts/train_feature_router.py
```

Trains a router using only handcrafted features (no embeddings) for comparison against the DistilBERT router. This tests Hypothesis H1.

**Step 7: Restart Backend to Load Trained Model**

```bash
docker compose restart backend
```

The backend's `RouterModel.__init__()` checks `data/models/distilbert_router` on startup. After restart, it loads the trained model instead of the base model.

### Phase 3: Evaluation

**Step 8: Run E4 — Router Evaluation**

```bash
docker compose exec backend python scripts/eval_router.py
```

Sweeps 21 thresholds, computes metrics: PGR (Performance Gap Recovered), cost savings, win rates, routing accuracy. Saves to `data/results/evaluation_results.json`.

**Step 9: Run RouteLLM Baseline Comparison**

```bash
docker compose exec backend python scripts/eval_routellm_baseline.py
```

Evaluates the pre-trained RouteLLM matrix factorization router for comparison.

**Step 10: Run E6 — Error Analysis**

```bash
docker compose exec backend python scripts/eval_error_analysis.py
```

Identifies routing failures, classifies error types, generates case studies.

### Phase 4: Verification

After all steps, verify the system works end-to-end:

1. Open `http://localhost:3000`
2. Send a simple query like "What is 2+2?" → should route to **Local** (Phi-3)
3. Send a complex query like "Write a detailed analysis of the economic implications of quantum computing on global supply chains" → should route to **Cloud** (GPT-4o-mini)
4. Check the Dashboard page for routing statistics
5. Check the Experiments page for results visualization

---

## Important Implementation Details

### Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Pydantic settings (reads .env)
│   ├── routers/             # API endpoints (chat, compare, metrics, experiments)
│   ├── services/
│   │   ├── router_model.py  # DistilBERT classifier (inference)
│   │   ├── feature_extractor.py
│   │   ├── ollama_client.py # Local LLM wrapper
│   │   ├── openai_client.py # Cloud LLM wrapper
│   │   └── judge.py         # GPT-4o-mini judge for scoring
│   ├── schemas/             # Pydantic request/response models
│   └── db/                  # SQLite models and database setup
├── frontend/
│   └── src/
│       ├── app/             # Pages: chat, compare, dashboard, experiments
│       ├── components/      # UI components
│       ├── hooks/           # useChat, useExperiment, etc.
│       └── lib/             # API client, types, utilities
├── scripts/
│   ├── eval_baselines.py    # E1: MT-Bench baseline evaluation
│   ├── judge_validation.py  # E2: Judge consistency check
│   ├── label_data.py        # E3: Generate labeled training data
│   ├── train_router.py      # E3: Train DistilBERT router
│   ├── train_feature_router.py  # E3: Feature-only ablation
│   ├── eval_routellm_baseline.py # E3: RouteLLM comparison
│   ├── eval_router.py       # E4/E5: Threshold sweep evaluation
│   └── eval_error_analysis.py   # E6: Error analysis
├── data/
│   ├── raw/                 # MT-Bench questions, MixInstruct
│   ├── labeled/             # Labeled training data (generated)
│   ├── models/              # Trained router models (generated)
│   └── results/             # Evaluation results (generated)
├── utils/
│   └── data_splits.py       # Shared train/val/test splitting
├── docker-compose.yml       # Backend only (frontend runs locally)
└── .env                     # API keys and configuration
```

### Router Logic (backend/services/router_model.py)

The router outputs `local_confidence` (probability that the local model is sufficient). If `local_confidence >= threshold` (default 0.6), routes to local Phi-3. Otherwise, routes to cloud GPT-4o-mini.

### Experiment Scripts Map

| ID | Script | What it does | Depends on |
|----|--------|-------------|------------|
| E1 | `eval_baselines.py` | Score both models on MT-Bench | MT-Bench data |
| E2 | `judge_validation.py` | Validate judge consistency | E1 results |
| E3 | `label_data.py` | Generate labeled training data (18K) | Working Ollama + OpenAI |
| E3 | `train_router.py` | Train DistilBERT classifier | Labeled data (18K) from above |
| E3 | `train_feature_router.py` | Feature-only ablation | Labeled data (18K) |
| E3 | `eval_routellm_baseline.py` | RouteLLM MF baseline | MT-Bench data |
| E4/E5 | `eval_router.py` | Threshold sweep, all metrics | Trained router + E1 results |
| E6 | `eval_error_analysis.py` | Routing failure analysis | E4 results + E1 results |

### Scientific Hypotheses Being Tested

- **H1:** Surface-level features predict routing accuracy (>70% accuracy with features only)
- **H2:** Local models handle routine queries comparably (>80% win rate on routine queries)
- **H3:** Quality-cost Pareto frontier has diminishing returns (first 20% cloud captures 50%+ improvement)
- **H4:** Router generalization degrades across domains (>10% accuracy drop on specialized domains)

---

## Troubleshooting

- **Script fails with import error:** Make sure to run inside Docker container (`docker compose exec backend python ...`)
- **Ollama not reachable from backend:** Check `OLLAMA_BASE_URL=http://host.docker.internal:11434` in `.env` (Mac) or `http://172.17.0.1:11434` (Linux)
- **Out of memory on GPU:** Ollama + DistilBERT training may compete for VRAM. Run training when chat is idle.
- **Script hangs on Ollama calls:** Phi-3 can be slow on CPU. Check `ollama serve` is running and GPU is being used (`ollama ps`).
- **Resume interrupted experiments:** Most scripts support `--resume` flag.

---

## How to Interact

- **Plan first, execute later.** Read all relevant source files before proposing any actions.
- Produce the full plan organized by phase, with numbered steps, dependencies, and verification criteria.
- For each script, read the actual source code and confirm: correct imports, correct file paths, correct model names, correct API endpoints.
- Identify any code that needs fixing or updating before it can run successfully with our current setup (e.g., model name mismatches, missing data files, import paths).
- Estimate total OpenAI API cost across all phases so the user can budget.
- Present the plan to the user for approval before executing anything.
- After approval, guide execution one step at a time, verifying outputs before moving on.

# Intelligent LLM Router for Edge-Cloud Inference

A trained LLM-based routing system that automatically decides whether a user query should be handled by a small, free, local model (Phi-3, 3.8B) or escalated to a larger, paid cloud model (GPT-4o-mini) — achieving near-cloud quality at half the cost.

**Key Results:** 56.8% Performance Gap Recovery | 55% Cost Savings | AUROC 0.8

---

## Architecture

```
┌─────────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│   Frontend       │────▶│  Backend (FastAPI)     │────▶│  Ollama (Phi-3)  │
│   Next.js 15     │◀────│  Docker · Port 8080    │     │  Native · 11434  │
│   Local · 3000   │     │                       │     └──────────────────┘
└─────────────────┘     │  ┌─────────────────┐  │     ┌──────────────────┐
                        │  │ DistilBERT      │  │────▶│  OpenAI API      │
                        │  │ Router (66M)    │  │     │  GPT-4o-mini     │
                        │  └─────────────────┘  │     └──────────────────┘
                        └───────────────────────┘
```

| Component | Technology | Runs On |
|-----------|-----------|---------|
| Local LLM | Phi-3 via Ollama | Host machine (GPU) |
| Cloud LLM | GPT-4o-mini via OpenAI API | Cloud |
| Router | DistilBERT fine-tuned (66M params) | Docker (CPU) |
| Backend | FastAPI (Python 3.11) | Docker |
| Frontend | Next.js 15, React 19, TailwindCSS 4 | Local (npm) |
| Database | SQLite (async) | Docker |

---

## Prerequisites

Before starting, make sure you have the following installed:

- **Docker** and **Docker Compose** (v2+) — [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js ≥ 20** — [Install Node.js](https://nodejs.org/)
- **Ollama** — [Install Ollama](https://ollama.com/)
- **OpenAI API key** — [Get API key](https://platform.openai.com/api-keys)
- **NVIDIA GPU with CUDA drivers** (recommended, not required — Ollama falls back to CPU)

---

## Data & Models (Download First)

The `data/` folder is **not included in the repo** (too large for GitHub — the trained model alone is 267MB).

**Download from:** [Google Drive link] (https://drive.google.com/drive/folders/1SLPsx8NTAqWZ9sb_p9DfunVhRid_mrkI?usp=sharing)

After downloading, place the `data/` folder at the project root (overwrite the current empty one):

> **Important:** The router will not work without `data/models/distilbert_router/`. Make sure this folder is in place before starting the backend.

---

## Setup (Step by Step)

### Step 1: Clone the Repository

```bash
git clone https://github.com/victorhwn7255/ai6130-llm-project.git
```

### Step 2: Download and Place the Data Folder

Download the `data/` folder from the shared Google Drive link and place it at the project root (see structure above).

### Step 3: Create the `.env` File

Create a `.env` file in the project root with the following content. Replace `sk-your-key-here` with your actual OpenAI API key:

```dotenv
# ── Models ──
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=phi3:latest
CLOUD_MODEL=gpt-4o-mini
JUDGE_MODEL=gpt-4o-mini

# ── Router ──
ROUTER_MODEL_PATH=data/models/distilbert_router
ROUTING_THRESHOLD=0.7

# ── Cost Model ──
CLOUD_INPUT_COST_PER_1M=0.15
CLOUD_OUTPUT_COST_PER_1M=0.60

# ── Database ──
DATABASE_URL=sqlite+aiosqlite:///data/routing_logs.db

# ── App ──
BACKEND_URL=http://backend:8000
NEXT_PUBLIC_API_URL=http://localhost:8080

# ── API Key ──
OPENAI_API_KEY=sk-your-key-here
```

### Step 4: Start Ollama (Runs Natively on Host)

Ollama runs on your host machine, not inside Docker. This is necessary for GPU acceleration.

```bash
# Start the Ollama server
ollama serve
```

Then in a separate terminal, pull the Phi-3 model (first time only, ~2GB download):

```bash
ollama pull phi3:latest
```

Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
# Should return a JSON list including phi3:latest
```

### Step 5: Start the Backend (Docker)

```bash
docker compose up -d --build
```

This builds and starts the FastAPI backend container. It installs all Python dependencies automatically via the Dockerfile. The backend will be available at `http://localhost:8080`.

Wait until you see the health check passing, then verify:

```bash
curl http://localhost:8080/health
# Should return: {"status":"ok"}
```

### Step 6: Start the Frontend (Local)

Open a **new terminal** and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Step 7: Verify Everything Works

1. Open `http://localhost:3000` in your browser
2. Type a message like "What is 2+2?" — it should route to the local model
3. Try a harder query like "Implement binary search in Python" — it may route to cloud
4. Check the dashboard at `http://localhost:3000/dashboard` for routing statistics

---

## Project Structure

```
hybrid-llm-router/
├── backend/                  # FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py               # App entrypoint
│   ├── routers/              # API endpoints
│   ├── services/             # LLM clients, router model, judge
│   ├── schemas/              # Pydantic models
│   └── db/                   # SQLite database
├── frontend/                 # Next.js 15 frontend
│   ├── package.json
│   └── src/
│       ├── app/              # Pages (chat, compare, dashboard, experiments)
│       ├── components/
│       ├── hooks/
│       └── lib/              # API client, types, utilities
├── scripts/                  # Evaluation and training scripts
│   ├── eval_baselines.py     # E1: MT-Bench baseline
│   ├── label_data.py         # E3a: Label 24K examples
│   ├── train_router.py       # E3b: Train DistilBERT
│   ├── train_feature_router.py  # E3c: Feature-only ablation
│   └── eval_router.py        # E4/E5/E6: Full evaluation
├── utils/                    # Shared utilities
│   └── data_splits.py        # Reproducible train/val/test splits
├── data/                     # Models, results, labeled data (from Google Drive)
├── docker-compose.yml
├── .env                      # Environment config (not committed)
├── .env.example              # Template for .env
└── .gitignore
```

---

## Services Summary

| Service | URL | How It Runs |
|---------|-----|-------------|
| Ollama (Phi-3) | `http://localhost:11434` | Native on host (`ollama serve`) |
| Backend (FastAPI) | `http://localhost:8080` | Docker (`docker compose up`) |
| Frontend (Next.js) | `http://localhost:3000` | Local (`npm run dev`) |

You need **three terminals** running simultaneously:

1. `ollama serve`
2. `docker compose up --build` (from project root)
3. `cd frontend && npm install && npm run dev`

---

## Key Results

| Metric | Value |
|--------|-------|
| Performance Gap Recovery (PGR) | 56.8% [40.8%, 73.0%] |
| Cost Savings | 55.0% |
| AUROC | 0.79 |
| Routing Accuracy | 80.71% |
| Routed Quality | 8.19 / 10 |
| Total Build Cost | $6.45 |

The router correctly escalates hard domains (math 72.9% PGR, coding 67.7%, reasoning 91.7%) while keeping easy domains local (writing, extraction, STEM), saving 55% of API costs while recovering 57% of the quality gap between local-only and cloud-only.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router), React, TailwindCSS, Recharts | 15 / 19 / 4 |
| Backend | FastAPI, Uvicorn | ≥0.115 |
| Local LLM | Ollama + Phi-3 | latest |
| Cloud LLM | OpenAI GPT-4o-mini | — |
| Router | DistilBERT (HuggingFace Transformers) | 4.44.0 |
| ML | PyTorch, scikit-learn, scipy | 2.4.0 |
| Database | SQLite (aiosqlite + SQLAlchemy async) | — |
| Containerization | Docker Compose | v2+ |
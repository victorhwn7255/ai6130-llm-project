# LLM Cloud-Edge Router

A cost-aware routing system that intelligently routes queries between an edge LLM (Phi-3.5-mini via Ollama) and a cloud LLM (GPT-4o-mini) to optimize cost while maintaining quality.

## Prerequisites

- Docker and Docker Compose
- OpenAI API key

## Quick Start

1. Clone the repository and navigate to the project directory.

2. Create a `.env` file in the root directory:

```
OPENAI_API_KEY=your_api_key_here
```

3. Start all services:

```bash
docker compose up --build
```

4. Access the application:

| Service   | URL                     |
|-----------|-------------------------|
| Frontend  | http://localhost:3030   |
| Backend   | http://localhost:8000   |
| Ollama    | http://localhost:11434  |

## Project Structure

```
.
├── backend/          # FastAPI backend
│   ├── routers/      # API endpoints
│   ├── services/     # LLM clients, router model, judge
│   ├── schemas/      # Pydantic models
│   └── db/           # SQLite database
├── frontend/         # Next.js frontend
│   └── src/
│       ├── app/      # Pages (chat, compare, dashboard, experiments)
│       ├── components/
│       ├── hooks/
│       └── lib/      # API client, types, utilities
├── scripts/          # Evaluation and training scripts
├── utils/            # Shared utilities
└── data/             # Models, results, labeled data
```

## Running Experiments

From the frontend Experiments page, or via CLI inside the backend container:

```bash
docker compose exec backend python scripts/eval_baselines.py
docker compose exec backend python scripts/train_router.py
docker compose exec backend python scripts/eval_router.py
```

## Stopping Services

```bash
docker compose down
```

To also remove volumes (database, models):

```bash
docker compose down -v
```

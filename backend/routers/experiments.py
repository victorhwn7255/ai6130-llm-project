"""
Experiments API router.

Endpoints for running and monitoring evaluation experiments.
"""
import asyncio
import json
import re
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/experiments", tags=["experiments"])

# Experiment ID to script path mapping
EXPERIMENT_SCRIPTS = {
    "e1_baselines": "scripts/eval_baselines.py",
    "e2_judge_validation": "scripts/judge_validation.py",
    "e3_label_data": "scripts/label_data.py",
    "e3_train_router": "scripts/train_router.py",
    "e3_train_feature": "scripts/train_feature_router.py",
    "e3_routellm": "scripts/eval_routellm_baseline.py",
    "e4_evaluation": "scripts/eval_router.py",
    "e6_error_analysis": "scripts/eval_error_analysis.py",
}

# Experiment ID to results file mapping
EXPERIMENT_RESULTS = {
    "e1_baselines": ["data/results/mtbench_local_scores.json", "data/results/mtbench_cloud_scores.json"],
    "e2_judge_validation": ["data/results/judge_validation.json"],
    "e3_label_data": ["data/labeled_data.json"],
    "e3_train_router": ["data/results/router_accuracy.json"],
    "e3_train_feature": ["data/results/feature_router_accuracy.json"],
    "e3_routellm": ["data/results/routellm_accuracy.json"],
    "e4_evaluation": ["data/results/evaluation_results.json"],
    "e6_error_analysis": ["data/results/error_analysis.json"],
}

ExperimentId = Literal[
    "e1_baselines",
    "e2_judge_validation",
    "e3_label_data",
    "e3_train_router",
    "e3_train_feature",
    "e3_routellm",
    "e4_evaluation",
    "e6_error_analysis",
]

ExperimentStatus = Literal["idle", "running", "completed", "failed"]


class ExperimentProgress(BaseModel):
    current: int
    total: int
    percent: float


class ExperimentState(BaseModel):
    experiment_id: str
    status: ExperimentStatus
    progress: Optional[ExperimentProgress] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    results: Optional[dict] = None
    error: Optional[str] = None


class ExperimentConfig(BaseModel):
    judge_model: Optional[str] = None
    limit: Optional[int] = None
    threshold: Optional[float] = None


class CostEstimate(BaseModel):
    experiment_id: str
    calls: int
    estimated_cost: float
    model: str


# In-memory state storage
experiments_state: dict[str, ExperimentState] = {}
experiments_logs: dict[str, deque] = {}
experiments_processes: dict[str, asyncio.subprocess.Process] = {}


def get_initial_state(experiment_id: str) -> ExperimentState:
    """Get initial state for an experiment."""
    return ExperimentState(
        experiment_id=experiment_id,
        status="idle",
        progress=None,
        started_at=None,
        completed_at=None,
        results=None,
        error=None,
    )


def load_results(experiment_id: str) -> Optional[dict]:
    """Load results from the experiment's result files."""
    result_files = EXPERIMENT_RESULTS.get(experiment_id, [])
    results = {}

    for filepath in result_files:
        path = Path(filepath)
        if path.exists():
            try:
                with open(path) as f:
                    data = json.load(f)
                    # Use filename without extension as key
                    key = path.stem
                    results[key] = data
            except (json.JSONDecodeError, IOError):
                continue

    return results if results else None


async def run_experiment_process(experiment_id: str, config: ExperimentConfig):
    """Run an experiment script as a subprocess."""
    script_path = EXPERIMENT_SCRIPTS.get(experiment_id)
    if not script_path:
        return

    # Build command with optional config overrides
    cmd = ["python", script_path]
    if config.judge_model:
        cmd.extend(["--judge-model", config.judge_model])
    if config.limit:
        cmd.extend(["--limit", str(config.limit)])
    if config.threshold:
        cmd.extend(["--threshold", str(config.threshold)])

    # Initialize log buffer
    experiments_logs[experiment_id] = deque(maxlen=1000)

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=Path(__file__).parent.parent.parent,  # Project root
        )
        experiments_processes[experiment_id] = process

        # Read output line by line
        progress_pattern = re.compile(r"\[PROGRESS\]\s*(\d+)/(\d+)")

        async for line in process.stdout:
            line_text = line.decode().strip()
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_entry = f"[{timestamp}] {line_text}"
            experiments_logs[experiment_id].append(log_entry)

            # Parse progress updates
            match = progress_pattern.search(line_text)
            if match:
                current = int(match.group(1))
                total = int(match.group(2))
                percent = (current / total * 100) if total > 0 else 0

                state = experiments_state.get(experiment_id)
                if state:
                    state.progress = ExperimentProgress(
                        current=current,
                        total=total,
                        percent=percent,
                    )

        # Wait for process to complete
        await process.wait()

        # Update state based on exit code
        state = experiments_state.get(experiment_id)
        if state:
            if process.returncode == 0:
                state.status = "completed"
                state.results = load_results(experiment_id)
            else:
                state.status = "failed"
                state.error = f"Process exited with code {process.returncode}"
            state.completed_at = datetime.now().isoformat()

    except Exception as e:
        state = experiments_state.get(experiment_id)
        if state:
            state.status = "failed"
            state.error = str(e)
            state.completed_at = datetime.now().isoformat()
    finally:
        experiments_processes.pop(experiment_id, None)


@router.post("/{experiment_id}/run", response_model=ExperimentState)
async def run_experiment(experiment_id: ExperimentId, config: ExperimentConfig = None):
    """Trigger an experiment to run."""
    if config is None:
        config = ExperimentConfig()

    # Check if already running
    current_state = experiments_state.get(experiment_id)
    if current_state and current_state.status == "running":
        raise HTTPException(status_code=409, detail="Experiment is already running")

    # Initialize state
    state = ExperimentState(
        experiment_id=experiment_id,
        status="running",
        progress=None,
        started_at=datetime.now().isoformat(),
        completed_at=None,
        results=None,
        error=None,
    )
    experiments_state[experiment_id] = state

    # Start experiment in background
    asyncio.create_task(run_experiment_process(experiment_id, config))

    return state


@router.get("/{experiment_id}/status", response_model=ExperimentState)
async def get_experiment_status(experiment_id: ExperimentId):
    """Get the current status of an experiment."""
    state = experiments_state.get(experiment_id)

    if not state:
        # Check if results exist from a previous run
        results = load_results(experiment_id)
        if results:
            return ExperimentState(
                experiment_id=experiment_id,
                status="completed",
                results=results,
            )
        return get_initial_state(experiment_id)

    return state


@router.get("/{experiment_id}/logs")
async def stream_experiment_logs(experiment_id: ExperimentId):
    """Stream live log output from a running experiment."""
    async def generate():
        sent_count = 0
        logs = experiments_logs.get(experiment_id, deque())

        while True:
            # Send any new log entries
            current_logs = list(logs)
            for i, line in enumerate(current_logs[sent_count:], start=sent_count):
                yield f"data: {json.dumps({'type': 'log', 'message': line})}\n\n"
            sent_count = len(current_logs)

            # Check if experiment is still running
            state = experiments_state.get(experiment_id)
            if state and state.status in ("completed", "failed"):
                yield f"data: {json.dumps({'type': 'complete', 'status': state.status})}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/results")
async def get_all_results():
    """Get all available experiment results."""
    results = {}

    for experiment_id in EXPERIMENT_SCRIPTS.keys():
        state = experiments_state.get(experiment_id)

        if state:
            results[experiment_id] = state
        else:
            # Check for existing results
            data = load_results(experiment_id)
            if data:
                results[experiment_id] = ExperimentState(
                    experiment_id=experiment_id,
                    status="completed",
                    results=data,
                )
            else:
                results[experiment_id] = get_initial_state(experiment_id)

    return results


@router.get("/cost-estimate", response_model=list[CostEstimate])
async def get_cost_estimates():
    """Get estimated API cost for experiments."""
    # Cost per 1M tokens for gpt-4o-mini
    input_cost = 0.15
    output_cost = 0.60

    # Rough estimates based on experiment requirements
    estimates = [
        CostEstimate(
            experiment_id="e1_baselines",
            calls=160,  # 80 questions × 2 models
            estimated_cost=0.40,
            model="gpt-4o-mini",
        ),
        CostEstimate(
            experiment_id="labeling",
            calls=5000,  # Full labeling run
            estimated_cost=10.00,
            model="gpt-4o-mini",
        ),
        CostEstimate(
            experiment_id="e4_pairwise",
            calls=80,  # Pairwise judging
            estimated_cost=0.20,
            model="gpt-4o-mini",
        ),
        CostEstimate(
            experiment_id="e2_judge_validation",
            calls=50,
            estimated_cost=0.15,
            model="gpt-4o-mini",
        ),
    ]

    return estimates

"""AI Life Orchestrator — FastAPI entrypoint.

The persistent meta-agent that sits above the domain AI agents: it ingests signals,
maintains a real-time life-state, resolves cross-domain conflicts, prioritises the
day around emotional readiness, reasons across three horizons, proposes pre-authorised
actions, and produces the daily briefing — reasoning through the ai-model-router.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException

from src.config import settings
from src.models import (
    ActionLogEntry,
    ActionNote,
    Briefing,
    CycleResult,
    Insight,
    LifeState,
    OrchestrateRequest,
    ProactiveAction,
    Signal,
    SignalBatchIn,
    SignalIn,
)
from src.action_engine import approve_action, override_action, reject_action
from src.decision_engine import generate_insights
from src.orchestrator import compute_life_state, run_cycle
from src.repository import repository
from src.scheduler import scheduler
from src.timeutil import ensure_utc, utcnow

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai-orchestrator")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    try:
        yield
    finally:
        await scheduler.stop()


app = FastAPI(
    title="NEXUS AI Life Orchestrator",
    description="Persistent meta-agent coordinating domain AI agents into a coherent, proactive life-state.",
    version="1.0.0",
    lifespan=lifespan,
)


def _to_signal(user_id: str, s: SignalIn) -> Signal:
    return Signal(
        user_id=user_id,
        domain=s.domain,
        metric=s.metric,
        value=s.value,
        unit=s.unit,
        source=s.source,
        timestamp=ensure_utc(s.timestamp) if s.timestamp else utcnow(),
    )


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ai-orchestrator",
        "environment": settings.ENV,
        "port": settings.PORT,
        "scheduler_enabled": settings.ENABLE_SCHEDULER,
        "orchestration_interval_sec": settings.ORCHESTRATION_INTERVAL_SEC,
        "known_users": len(repository.known_users()),
    }


# ── Signal ingestion ──────────────────────────────────────────────────
# NB: the static /signals/batch route MUST be declared before the parametrized
# /signals/{user_id} route, otherwise "batch" is captured as a user_id.
@app.post("/signals/batch", status_code=202)
async def ingest_signal_batch(batch: SignalBatchIn):
    for s in batch.signals:
        repository.add_signal(_to_signal(batch.user_id, s))
    return {"status": "accepted", "user_id": batch.user_id, "count": len(batch.signals)}


@app.post("/signals/{user_id}", status_code=202)
async def ingest_signal(user_id: str, signal: SignalIn):
    repository.add_signal(_to_signal(user_id, signal))
    return {"status": "accepted", "user_id": user_id, "metric": signal.metric}


# ── Life-state ────────────────────────────────────────────────────────
@app.get("/life-state/{user_id}", response_model=LifeState)
async def get_life_state(user_id: str):
    return compute_life_state(user_id)


@app.get("/life-state/{user_id}/history", response_model=List[LifeState])
async def get_life_state_history(user_id: str):
    return repository.life_state_history(user_id)


# ── Orchestration ─────────────────────────────────────────────────────
@app.post("/orchestrate/{user_id}", response_model=CycleResult)
async def orchestrate(user_id: str, request: Optional[OrchestrateRequest] = None):
    req = request or OrchestrateRequest()
    return await run_cycle(
        user_id,
        tasks=req.tasks,
        domain_recommendations=req.domain_recommendations,
        auto_execute=req.auto_execute,
    )


@app.get("/insights/{user_id}", response_model=List[Insight])
async def get_insights(user_id: str):
    life_state = compute_life_state(user_id)
    history = repository.life_state_history(user_id)
    return generate_insights(life_state, history, conflicts=[], ranked_tasks=[])


@app.get("/briefing/{user_id}", response_model=Briefing)
async def get_briefing(user_id: str):
    briefing = repository.latest_briefing(user_id)
    if briefing is None:
        raise HTTPException(status_code=404, detail="No briefing yet — run /orchestrate first.")
    return briefing


# ── Proactive actions + immutable log ─────────────────────────────────
@app.get("/actions/{user_id}", response_model=List[ProactiveAction])
async def list_actions(user_id: str):
    return repository.actions_for_user(user_id)


@app.get("/actions/{user_id}/log", response_model=List[ActionLogEntry])
async def action_log(user_id: str):
    return repository.log_for_user(user_id)


@app.post("/actions/{action_id}/approve", response_model=ProactiveAction)
async def approve(action_id: str, body: ActionNote | None = None):
    try:
        return approve_action(action_id, (body.note if body else None))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.post("/actions/{action_id}/reject", response_model=ProactiveAction)
async def reject(action_id: str, body: ActionNote | None = None):
    try:
        return reject_action(action_id, (body.note if body else None))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.post("/actions/{action_id}/override", response_model=ProactiveAction)
async def override(action_id: str, body: ActionNote | None = None):
    try:
        return override_action(action_id, (body.note if body else None))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


# ── Admin ─────────────────────────────────────────────────────────────
@app.get("/admin/active-users")
async def active_users():
    return {"users": repository.known_users(), "count": len(repository.known_users())}


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting AI Life Orchestrator on %s:%s", settings.HOST, settings.PORT)
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

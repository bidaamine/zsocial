"""OrchestratorService — the meta-agent that runs a full coordination cycle.

Ties the engines together in the order the PDF describes: synthesise signals into a
life-state, resolve cross-domain conflicts, prioritise the day around emotional
readiness, reason across three horizons, propose pre-authorised actions, and produce
the daily briefing.
"""
from __future__ import annotations

from typing import List, Optional

from src.briefing import generate_briefing
from src.conflict_resolver import resolve_conflicts
from src.decision_engine import generate_insights
from src.life_state import build_life_state
from src.models import (
    CycleResult,
    DomainRecommendationIn,
    LifeState,
    TaskIn,
)
from src.priority_engine import rank_tasks
from src.action_engine import propose_actions
from src.repository import repository


def compute_life_state(user_id: str) -> LifeState:
    """Build the current life-state from stored signals WITHOUT persisting a snapshot."""
    latest = repository.latest_by_metric(user_id)
    return build_life_state(user_id, latest)


async def run_cycle(
    user_id: str,
    tasks: Optional[List[TaskIn]] = None,
    domain_recommendations: Optional[List[DomainRecommendationIn]] = None,
    auto_execute: bool = False,
) -> CycleResult:
    # 1. Real-time life-state model (and persist a snapshot for trend analysis).
    latest = repository.latest_by_metric(user_id)
    life_state = build_life_state(user_id, latest)
    repository.save_life_state(life_state)
    history = repository.life_state_history(user_id)

    # 2. Cross-domain conflict resolution.
    conflicts = resolve_conflicts(domain_recommendations or [])

    # 3. Priority ranking (weighs urgency, importance, emotional readiness).
    ranked = rank_tasks(tasks or [], life_state)

    # 4. Decision engine across the three horizons.
    insights = generate_insights(life_state, history, conflicts, ranked)

    # 5. Proactive, pre-authorised actions.
    actions = propose_actions(user_id, insights, life_state, auto_execute)

    # 6. Daily briefing (LLM via the model router, deterministic fallback).
    briefing = await generate_briefing(user_id, life_state, insights, conflicts, ranked, actions)
    repository.save_briefing(briefing)

    return CycleResult(
        user_id=user_id,
        life_state=life_state,
        insights=insights,
        conflicts=conflicts,
        ranked_tasks=ranked,
        proposed_actions=actions,
        briefing=briefing,
    )

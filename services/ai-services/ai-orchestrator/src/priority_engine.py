"""Priority-ranking engine.

PDF: "a priority-ranking engine that weighs urgency, importance, and emotional
readiness simultaneously. If it detects that you're stressed ... it will not add
more tasks to your plate. Instead it ... reschedules non-critical items."

Emotional readiness is derived from the life-state (readiness = 1 - stress). Under
stress protection, demanding non-critical tasks are deferred rather than surfaced.
"""
from __future__ import annotations

import uuid
from typing import List

from src.config import settings
from src.models import DIM_STRESS, LifeState, RankedTask, TaskIn

CRITICAL_URGENCY = 0.85
DEMAND_PENALTY = 0.5


def rank_tasks(tasks: List[TaskIn], life_state: LifeState) -> List[RankedTask]:
    stress = life_state.dimensions[DIM_STRESS].score
    readiness = 1.0 - stress
    stress_protected = stress >= settings.STRESS_PROTECTION_THRESHOLD

    w_u = settings.PRIORITY_URGENCY_WEIGHT
    w_i = settings.PRIORITY_IMPORTANCE_WEIGHT
    w_r = settings.PRIORITY_READINESS_WEIGHT

    ranked: List[RankedTask] = []
    for task in tasks:
        base = w_u * task.urgency + w_i * task.importance + w_r * readiness
        demand_penalty = (1.0 - readiness) * task.demand * DEMAND_PENALTY
        score = max(0.0, base - demand_penalty)

        if task.urgency >= CRITICAL_URGENCY:
            recommendation, reason = "today", "Critical urgency — must be handled today."
        elif stress_protected and task.demand >= 0.6:
            recommendation, reason = (
                "defer",
                "Stress is elevated — deferring this demanding, non-critical item to protect your capacity.",
            )
        elif score >= 0.5:
            recommendation, reason = "today", "High combined urgency/importance for your current readiness."
        else:
            recommendation, reason = "defer", "Lower priority given your current state; scheduled for a better window."

        ranked.append(
            RankedTask(
                id=task.id or f"task-{uuid.uuid4().hex[:8]}",
                title=task.title,
                domain=task.domain,
                score=round(score, 4),
                recommendation=recommendation,
                reason=reason,
            )
        )

    ranked.sort(key=lambda r: r.score, reverse=True)
    return ranked

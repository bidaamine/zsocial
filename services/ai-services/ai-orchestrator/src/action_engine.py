"""Proactive action engine + immutable action log.

PDF: "The Orchestrator can autonomously take pre-authorised actions" and every action
is kept as "an immutable, timestamped record ... each with an override button so the
user can reverse any action within 24 hours."

High-risk actions always require explicit approval; low-risk ones may auto-execute
when the user opts in. Every state change is appended to an append-only log; nothing
is ever deleted, and overrides are a new terminal state, not a rollback of history.
"""
from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Dict, List

from src.models import (
    ActionLogEntry,
    ActionStatus,
    ActionType,
    Insight,
    LifeState,
    ProactiveAction,
)
from src.repository import repository
from src.timeutil import utcnow

OVERRIDE_WINDOW = timedelta(hours=24)

# Actions with real-world / outbound side effects always need a human yes.
HIGH_RISK: set = {
    ActionType.book_appointment,
    ActionType.order_groceries,
    ActionType.reschedule_meeting,
    ActionType.draft_message,
}

_DESCRIPTIONS: Dict[ActionType, str] = {
    ActionType.simplify_schedule: "Simplify tomorrow — reschedule non-critical items and protect recovery time.",
    ActionType.recovery_suggestion: "Suggest an active-recovery day and lighten today's training load.",
    ActionType.review_budget: "Open a budget review to get ahead of the upcoming cash-flow gap.",
    ActionType.reconnect_contact: "Surface a friendly check-in with a contact you've been neglecting.",
    ActionType.book_appointment: "Book a health appointment based on your recent signals.",
    ActionType.reschedule_meeting: "Reschedule a conflicting meeting to protect a higher-priority commitment.",
    ActionType.order_groceries: "Reorder household essentials that are running low.",
    ActionType.draft_message: "Draft a message on your behalf for your review.",
}

_SEVERITY_BASE = {"critical": 0.9, "warning": 0.8, "notice": 0.7, "info": 0.6}


def _avg_confidence(life_state: LifeState) -> float:
    confidences = [d.confidence for d in life_state.dimensions.values()]
    return sum(confidences) / len(confidences) if confidences else 0.0


def _log(action: ProactiveAction, event: str, note: str | None = None) -> None:
    repository.append_log(ActionLogEntry(action_id=action.id, user_id=action.user_id, event=event, note=note))


def propose_actions(
    user_id: str,
    insights: List[Insight],
    life_state: LifeState,
    auto_execute: bool = False,
) -> List[ProactiveAction]:
    """Turn insight recommendations into proactive actions (deduped by type)."""
    data_confidence = _avg_confidence(life_state)
    seen: set = set()
    actions: List[ProactiveAction] = []

    for insight in insights:
        if not insight.recommended_action:
            continue
        try:
            action_type = ActionType(insight.recommended_action)
        except ValueError:
            continue
        if action_type in seen:
            continue
        seen.add(action_type)

        requires_approval = action_type in HIGH_RISK
        sev_base = _SEVERITY_BASE.get(insight.severity.value, 0.6)
        confidence = round(min(1.0, sev_base * (0.6 + 0.4 * data_confidence)), 2)

        can_auto = auto_execute and not requires_approval and confidence >= 0.7
        status = ActionStatus.auto_executed if can_auto else ActionStatus.proposed

        action = ProactiveAction(
            id=f"act-{uuid.uuid4().hex[:10]}",
            user_id=user_id,
            type=action_type,
            description=_DESCRIPTIONS.get(action_type, action_type.value),
            rationale=f"{insight.title}: {insight.detail}",
            confidence=confidence,
            status=status,
            requires_approval=requires_approval,
            executed_at=utcnow() if can_auto else None,
            source_insight=insight.title,
        )
        repository.save_action(action)
        _log(action, status.value)
        actions.append(action)

    return actions


def approve_action(action_id: str, note: str | None = None) -> ProactiveAction:
    action = repository.get_action(action_id)
    if action is None:
        raise KeyError(action_id)
    if action.status != ActionStatus.proposed:
        raise ValueError(f"Action is '{action.status.value}', only 'proposed' actions can be approved.")
    _log(action, "approved", note)
    action.status = ActionStatus.executed
    action.executed_at = utcnow()
    repository.save_action(action)
    _log(action, "executed")
    return action


def reject_action(action_id: str, note: str | None = None) -> ProactiveAction:
    action = repository.get_action(action_id)
    if action is None:
        raise KeyError(action_id)
    if action.status != ActionStatus.proposed:
        raise ValueError(f"Action is '{action.status.value}', only 'proposed' actions can be rejected.")
    action.status = ActionStatus.rejected
    repository.save_action(action)
    _log(action, "rejected", note)
    return action


def override_action(action_id: str, note: str | None = None) -> ProactiveAction:
    action = repository.get_action(action_id)
    if action is None:
        raise KeyError(action_id)
    if action.status not in (ActionStatus.executed, ActionStatus.auto_executed, ActionStatus.approved):
        raise ValueError(f"Action is '{action.status.value}' and cannot be overridden.")
    anchor = action.executed_at or action.created_at
    if utcnow() - anchor > OVERRIDE_WINDOW:
        raise ValueError("The 24-hour override window for this action has expired.")
    action.status = ActionStatus.overridden
    action.overridden_at = utcnow()
    repository.save_action(action)
    _log(action, "overridden", note)
    return action

"""Decision engine — three simultaneous time horizons.

PDF: "The Decision Engine operates on three time horizons simultaneously — the next
24 hours (tactical), the next 30 days (strategic), and the next 12 months (life
planning) — and surfaces insights at each horizon in the user's daily AI briefing."

Tactical reads the current life-state, strategic reads the trend across recent
life-state snapshots, and the life horizon reads sustained multi-window patterns.
"""
from __future__ import annotations

from typing import List, Optional

from src.models import (
    DIM_FINANCIAL_PRESSURE,
    DIM_FOCUS,
    DIM_PHYSICAL_READINESS,
    DIM_SOCIAL_CONNECTEDNESS,
    DIM_STRESS,
    ActionType,
    Conflict,
    Horizon,
    Insight,
    LifeState,
    RankedTask,
    Severity,
)


def _mean(xs: List[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _trend(xs: List[float]) -> Optional[float]:
    """Recent-window mean minus older-window mean, or None if too little history."""
    if len(xs) < 4:
        return None
    half = len(xs) // 2
    return _mean(xs[half:]) - _mean(xs[:half])


def generate_insights(
    life_state: LifeState,
    history: List[LifeState],
    conflicts: List[Conflict],
    ranked_tasks: List[RankedTask],
) -> List[Insight]:
    dims = life_state.dimensions
    insights: List[Insight] = []

    # ── Tactical (next 24h) — current state ───────────────────
    stress = dims[DIM_STRESS]
    if stress.score >= 0.6 and stress.confidence > 0:
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.warning, category="wellbeing",
            title="Elevated stress right now",
            detail=f"Your stress reads {stress.score:.0%}. I'll keep today light and hold new demanding tasks.",
            recommended_action=ActionType.simplify_schedule.value,
        ))
    pr = dims[DIM_PHYSICAL_READINESS]
    if pr.score <= 0.4 and pr.confidence > 0:
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.notice, category="health",
            title="Low physical readiness",
            detail="Recovery markers are down — ease physical load and favour rest today.",
            recommended_action=ActionType.recovery_suggestion.value,
        ))
    fin = dims[DIM_FINANCIAL_PRESSURE]
    if fin.score >= 0.6 and fin.confidence > 0:
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.warning, category="finance",
            title="Cash-flow pressure this week",
            detail="Finances are tight — I've flagged a budget review before any discretionary spend.",
            recommended_action=ActionType.review_budget.value,
        ))
    soc = dims[DIM_SOCIAL_CONNECTEDNESS]
    if soc.score <= 0.3 and soc.confidence > 0:
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.notice, category="social",
            title="You've gone quiet socially",
            detail="Your interactions are low — a quick reconnect with someone you value would help.",
            recommended_action=ActionType.reconnect_contact.value,
        ))
    focus = dims[DIM_FOCUS]
    if focus.score <= 0.35 and focus.confidence > 0:
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.info, category="productivity",
            title="Fragmented focus",
            detail="High interruption load is splitting your attention — consider a protected focus block.",
        ))

    deferred = [t for t in ranked_tasks if t.recommendation == "defer"]
    if deferred:
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.info, category="productivity",
            title=f"Deferred {len(deferred)} item(s)",
            detail="Non-critical, demanding items were pushed to a better window to protect your capacity.",
        ))
    if conflicts:
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.notice, category="coordination",
            title=f"Resolved {len(conflicts)} cross-domain conflict(s)",
            detail=conflicts[0].resolution,
        ))

    if not any(i.horizon == Horizon.tactical for i in insights):
        insights.append(Insight(
            horizon=Horizon.tactical, severity=Severity.info, category="general",
            title="On track for today",
            detail="No pressing signals — proceeding with your normal plan.",
        ))

    # ── Strategic (next 30 days) — trend ──────────────────────
    wellbeing_trend = _trend([h.overall_wellbeing for h in history])
    stress_trend = _trend([h.dimensions[DIM_STRESS].score for h in history])
    if wellbeing_trend is None:
        insights.append(Insight(
            horizon=Horizon.strategic, severity=Severity.info, category="trend",
            title="Building your 30-day baseline",
            detail="I need a few more days of signals to surface reliable strategic trends.",
        ))
    else:
        if wellbeing_trend <= -0.08:
            insights.append(Insight(
                horizon=Horizon.strategic, severity=Severity.warning, category="trend",
                title="Wellbeing trending down",
                detail=f"Overall wellbeing has slipped {abs(wellbeing_trend):.0%} recently — worth a proactive reset.",
                recommended_action=ActionType.simplify_schedule.value,
            ))
        elif wellbeing_trend >= 0.08:
            insights.append(Insight(
                horizon=Horizon.strategic, severity=Severity.info, category="trend",
                title="Wellbeing trending up",
                detail=f"You're up {wellbeing_trend:.0%} over the window — keep the current routine.",
            ))
        if stress_trend is not None and stress_trend >= 0.1:
            insights.append(Insight(
                horizon=Horizon.strategic, severity=Severity.notice, category="trend",
                title="Stress creeping up over weeks",
                detail="A steady upward drift in stress — a structural tweak now beats a crisis later.",
            ))

    # ── Life (next 12 months) — sustained patterns ────────────
    avg_stress = _mean([h.dimensions[DIM_STRESS].score for h in history]) if history else stress.score
    avg_pr = _mean([h.dimensions[DIM_PHYSICAL_READINESS].score for h in history]) if history else pr.score
    if avg_stress >= 0.6:
        insights.append(Insight(
            horizon=Horizon.life, severity=Severity.warning, category="pattern",
            title="Sustained stress pattern",
            detail="Stress has run high across a long window — consider a structural change to your week, not just a quick fix.",
        ))
    elif avg_pr <= 0.4:
        insights.append(Insight(
            horizon=Horizon.life, severity=Severity.notice, category="pattern",
            title="Long-run recovery deficit",
            detail="Physical readiness stays low over time — a longer-term training/rest rebalance would compound.",
        ))
    else:
        insights.append(Insight(
            horizon=Horizon.life, severity=Severity.info, category="pattern",
            title="Steady long-term trajectory",
            detail="No concerning multi-month patterns — keep investing in what's working.",
        ))

    return insights

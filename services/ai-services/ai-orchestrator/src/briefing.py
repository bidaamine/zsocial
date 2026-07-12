"""Daily AI briefing.

Composes the life-state, insights, conflicts, top tasks and proposed actions into a
warm, concise briefing. It routes generation through the ai-model-router; if the
router is unavailable it falls back to a deterministic template built from the same
context, so a briefing is always produced.
"""
from __future__ import annotations

from typing import List

from src.models import (
    Briefing,
    Conflict,
    Horizon,
    Insight,
    LifeState,
    ProactiveAction,
    RankedTask,
)
from src.router_client import router_client


def _context_lines(
    life_state: LifeState,
    insights: List[Insight],
    conflicts: List[Conflict],
    ranked_tasks: List[RankedTask],
    proposed_actions: List[ProactiveAction],
) -> List[str]:
    lines: List[str] = []
    lines.append(
        f"Life-state: {life_state.summary_label} "
        f"(overall wellbeing {life_state.overall_wellbeing:.0%}, {life_state.signal_count} signals)."
    )
    for dim, score in life_state.dimensions.items():
        if score.confidence > 0:
            lines.append(f"- {dim.replace('_', ' ')}: {score.score:.0%} (confidence {score.confidence:.0%})")

    for horizon in (Horizon.tactical, Horizon.strategic, Horizon.life):
        for ins in [i for i in insights if i.horizon == horizon]:
            lines.append(f"[{horizon.value}] {ins.title} — {ins.detail}")

    for c in conflicts:
        lines.append(f"[conflict] {c.description} Resolution: {c.resolution}")

    today = [t for t in ranked_tasks if t.recommendation == "today"][:3]
    if today:
        lines.append("Top for today: " + "; ".join(t.title for t in today))

    if proposed_actions:
        lines.append("Proposed actions: " + "; ".join(f"{a.type.value} ({a.status.value})" for a in proposed_actions))

    return lines


def _template_briefing(user_id: str, context_lines: List[str]) -> Briefing:
    body = "\n".join(context_lines)
    text = (
        "Good morning. Here's your orchestrated briefing.\n\n"
        f"{body}\n\n"
        "I've prioritised your day around your current state and flagged anything that needs a decision."
    )
    return Briefing(user_id=user_id, text=text, generated_by="template")


async def generate_briefing(
    user_id: str,
    life_state: LifeState,
    insights: List[Insight],
    conflicts: List[Conflict],
    ranked_tasks: List[RankedTask],
    proposed_actions: List[ProactiveAction],
) -> Briefing:
    context_lines = _context_lines(life_state, insights, conflicts, ranked_tasks, proposed_actions)
    context = "\n".join(context_lines)

    prompt = (
        "You are the user's AI Life Orchestrator. Using ONLY the structured context below, "
        "write a warm, concise daily briefing (max ~120 words). Lead with how they are, then the "
        "1-3 things that matter today, then anything awaiting their decision. Calm, supportive tone; "
        "no invented facts.\n\n"
        f"CONTEXT:\n{context}"
    )

    response = await router_client.generate(
        prompt,
        user_id=user_id,
        task_type="generation",
        domain="general",
        privacy_sensitivity="sensitive",
        cost_envelope="balanced",
    )

    if response and (response.get("response_text") or "").strip():
        return Briefing(
            user_id=user_id,
            text=response["response_text"].strip(),
            generated_by=response.get("routed_model", "ai-model-router"),
        )

    # Router unavailable → deterministic fallback from the same context.
    return _template_briefing(user_id, context_lines)

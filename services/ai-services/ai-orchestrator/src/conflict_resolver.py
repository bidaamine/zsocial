"""Cross-Domain Conflict Resolution.

PDF innovation: "No platform today handles conflicts between life domains. If your
fitness plan says train tomorrow but your health agent detects elevated inflammation
markers and your calendar shows a high-stakes meeting, the Orchestrator resolves the
three-way conflict intelligently."

Recommendations carry a `category`; opposing categories (e.g. exertion vs recovery)
signal a conflict. The higher-priority domain wins (health/family outrank fitness/
social), and a concrete compromise is produced. Deterministic and side-effect free.
"""
from __future__ import annotations

from itertools import combinations
from typing import Dict, List, Set, Tuple

from src.models import Conflict, DomainRecommendationIn

# Higher number wins a conflict. Health and family safety outrank everything.
DOMAIN_PRIORITY: Dict[str, int] = {
    "health": 6,
    "family": 5,
    "finance": 4,
    "calendar": 3,
    "education": 2,
    "fitness": 2,
    "tasks": 1,
    "social": 1,
    "screen_time": 0,
    "mood": 0,
}

# Unordered pairs of mutually exclusive intents.
_OPPOSING: Set[frozenset] = {
    frozenset({"exertion", "recovery"}),
    frozenset({"spend", "save"}),
    frozenset({"work", "rest"}),
    frozenset({"stimulate", "calm"}),
}

# Compromise phrasing keyed by the *winning* category.
_COMPROMISE: Dict[str, str] = {
    "recovery": "Prioritise recovery: replace the planned exertion with light active recovery (walk / mobility).",
    "exertion": "Proceed with training, but scale the intensity so it doesn't compromise your other commitment.",
    "save": "Hold discretionary spend this cycle and redirect it to your savings buffer.",
    "spend": "Proceed with the purchase; it outranks the deferrable saving goal right now.",
    "rest": "Protect rest; move the work block to a lower-load window.",
    "work": "Keep the work commitment; reschedule the softer item around it.",
    "calm": "Choose the calming option now; the stimulating activity can wait.",
    "stimulate": "Keep the engaging activity; the low-value calm slot can move.",
}


def _opposing(cat_a: str, cat_b: str) -> bool:
    return frozenset({cat_a.lower(), cat_b.lower()}) in _OPPOSING


def _priority(domain: str) -> int:
    return DOMAIN_PRIORITY.get(domain.lower(), 1)


def _winner(a: DomainRecommendationIn, b: DomainRecommendationIn) -> Tuple[DomainRecommendationIn, DomainRecommendationIn]:
    pa, pb = _priority(a.domain.value), _priority(b.domain.value)
    if pa != pb:
        return (a, b) if pa > pb else (b, a)
    # Tie-break on intensity, then keep input order stable.
    return (a, b) if a.intensity >= b.intensity else (b, a)


def resolve_conflicts(recommendations: List[DomainRecommendationIn]) -> List[Conflict]:
    conflicts: List[Conflict] = []
    for a, b in combinations(recommendations, 2):
        if not _opposing(a.category, b.category):
            continue
        winner, loser = _winner(a, b)
        resolution = _COMPROMISE.get(
            winner.category.lower(),
            f"Favour the {winner.domain.value} recommendation and defer the {loser.domain.value} one.",
        )
        conflicts.append(
            Conflict(
                domains=[a.domain.value, b.domain.value],
                description=(
                    f"{a.domain.value} wants to '{a.action}' ({a.category}) while "
                    f"{b.domain.value} wants to '{b.action}' ({b.category})."
                ),
                winning_domain=winner.domain.value,
                resolution=resolution,
                rationale=(
                    f"{winner.domain.value} outranks {loser.domain.value} for wellbeing and safety, "
                    f"so its intent takes precedence and the other is adjusted around it."
                ),
            )
        )
    return conflicts

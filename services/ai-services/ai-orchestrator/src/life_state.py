"""Life-State Builder.

Synthesises the latest signal per metric into a probabilistic multi-dimensional
life-state (PDF: "From this it builds a real-time life-state model — a probabilistic
picture of where you are, where you're heading, and what you need").

Each metric is normalised to 0..1 and contributes to one or more life-state
dimensions with a weight and a direction (`invert=True` means a high raw value
lowers the dimension). Dimensions with no backing signals default to a neutral 0.5
with confidence 0, so the model never fabricates certainty it doesn't have.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple

from src.models import (
    ALL_DIMENSIONS,
    DIM_ENERGY,
    DIM_FINANCIAL_PRESSURE,
    DIM_FOCUS,
    DIM_PHYSICAL_READINESS,
    DIM_SOCIAL_CONNECTEDNESS,
    DIM_STRESS,
    DimensionScore,
    LifeState,
    Signal,
)

# metric -> (lo, hi, [(dimension, weight, invert), ...])
Effect = Tuple[str, float, bool]
METRIC_REGISTRY: Dict[str, Tuple[float, float, List[Effect]]] = {
    "resting_heart_rate": (50, 100, [(DIM_STRESS, 1.0, False), (DIM_PHYSICAL_READINESS, 0.7, True)]),
    "hrv": (20, 100, [(DIM_STRESS, 0.8, True), (DIM_PHYSICAL_READINESS, 1.0, False), (DIM_ENERGY, 0.5, False)]),
    "sleep_hours": (0, 9, [(DIM_ENERGY, 1.0, False), (DIM_PHYSICAL_READINESS, 0.8, False), (DIM_STRESS, 0.4, True)]),
    "recovery_score": (0, 100, [(DIM_PHYSICAL_READINESS, 1.0, False), (DIM_ENERGY, 0.7, False)]),
    "training_load": (0, 100, [(DIM_PHYSICAL_READINESS, 0.8, True)]),
    "inflammation_marker": (0, 10, [(DIM_PHYSICAL_READINESS, 1.0, True), (DIM_STRESS, 0.3, False)]),
    "late_night_minutes": (0, 120, [(DIM_STRESS, 0.8, False), (DIM_ENERGY, 0.7, True)]),
    "screen_time_hours": (0, 12, [(DIM_FOCUS, 0.5, True), (DIM_STRESS, 0.3, False)]),
    "overdue_tasks": (0, 15, [(DIM_STRESS, 1.0, False), (DIM_FOCUS, 0.7, True)]),
    "calendar_density": (0, 1, [(DIM_STRESS, 0.9, False), (DIM_FOCUS, 0.6, True), (DIM_ENERGY, 0.3, True)]),
    "notifications_per_hour": (0, 60, [(DIM_FOCUS, 1.0, True)]),
    "task_switches_per_hour": (0, 40, [(DIM_FOCUS, 0.8, True)]),
    "cash_flow_gap_days": (0, 60, [(DIM_FINANCIAL_PRESSURE, 1.0, True)]),
    "balance_trend": (-1, 1, [(DIM_FINANCIAL_PRESSURE, 0.7, True)]),
    "upcoming_bills_ratio": (0, 2, [(DIM_FINANCIAL_PRESSURE, 0.8, False)]),
    "social_interactions_today": (0, 15, [(DIM_SOCIAL_CONNECTEDNESS, 1.0, False)]),
    "neglected_contacts": (0, 10, [(DIM_SOCIAL_CONNECTEDNESS, 0.8, True)]),
    "messages_exchanged": (0, 50, [(DIM_SOCIAL_CONNECTEDNESS, 0.5, False)]),
    "mood_score": (0, 1, [(DIM_STRESS, 0.7, True), (DIM_ENERGY, 0.4, False)]),
}

# Number of metric-effects defined per dimension (for confidence).
_DEFINED_PER_DIM: Dict[str, int] = defaultdict(int)
for _lo, _hi, _effects in METRIC_REGISTRY.values():
    for _dim, _w, _inv in _effects:
        _DEFINED_PER_DIM[_dim] += 1

# How each dimension rolls up into overall wellbeing (weights sum to 1.0).
# `invert=True` dimensions (stress, financial_pressure) reduce wellbeing.
_WELLBEING_WEIGHTS: Dict[str, Tuple[float, bool]] = {
    DIM_STRESS: (0.25, True),
    DIM_ENERGY: (0.20, False),
    DIM_PHYSICAL_READINESS: (0.15, False),
    DIM_FINANCIAL_PRESSURE: (0.15, True),
    DIM_SOCIAL_CONNECTEDNESS: (0.15, False),
    DIM_FOCUS: (0.10, False),
}


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def _normalise(value: float, lo: float, hi: float) -> float:
    if hi == lo:
        return 0.0
    return _clamp((value - lo) / (hi - lo))


def _summary_label(dims: Dict[str, DimensionScore], wellbeing: float) -> str:
    stress = dims[DIM_STRESS]
    if stress.score >= 0.65 and stress.confidence > 0:
        return "stressed"
    fin = dims[DIM_FINANCIAL_PRESSURE]
    if fin.score >= 0.65 and fin.confidence > 0:
        return "financially-strained"
    social = dims[DIM_SOCIAL_CONNECTEDNESS]
    if social.score <= 0.3 and social.confidence > 0:
        return "socially-withdrawn"
    energy = dims[DIM_ENERGY]
    if energy.score >= 0.65 and stress.score <= 0.4:
        return "energized"
    if wellbeing >= 0.6:
        return "balanced"
    return "low"


def build_life_state(user_id: str, latest_by_metric: Dict[str, Signal]) -> LifeState:
    acc: Dict[str, Dict[str, float]] = {d: {"wsum": 0.0, "w": 0.0, "present": 0} for d in ALL_DIMENSIONS}

    for metric, signal in latest_by_metric.items():
        spec = METRIC_REGISTRY.get(metric)
        if spec is None:
            continue
        lo, hi, effects = spec
        norm = _normalise(signal.value, lo, hi)
        for dim, weight, invert in effects:
            contribution = (1.0 - norm) if invert else norm
            acc[dim]["wsum"] += weight * contribution
            acc[dim]["w"] += weight
            acc[dim]["present"] += 1

    dimensions: Dict[str, DimensionScore] = {}
    for dim in ALL_DIMENSIONS:
        a = acc[dim]
        score = (a["wsum"] / a["w"]) if a["w"] > 0 else 0.5  # neutral when unknown
        defined = _DEFINED_PER_DIM.get(dim, 0)
        confidence = (a["present"] / defined) if defined > 0 else 0.0
        dimensions[dim] = DimensionScore(score=_clamp(score), confidence=_clamp(confidence))

    wellbeing_num = 0.0
    for dim, (weight, invert) in _WELLBEING_WEIGHTS.items():
        val = dimensions[dim].score
        wellbeing_num += weight * ((1.0 - val) if invert else val)
    wellbeing = _clamp(wellbeing_num)

    return LifeState(
        user_id=user_id,
        dimensions=dimensions,
        overall_wellbeing=round(wellbeing, 4),
        summary_label=_summary_label(dimensions, wellbeing),
        signal_count=len(latest_by_metric),
    )

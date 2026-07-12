"""Pydantic schemas and enums for the AI Life Orchestrator."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from src.timeutil import utcnow


# ── Enums ─────────────────────────────────────────────────────────────
class SignalDomain(str, Enum):
    health = "health"
    fitness = "fitness"
    calendar = "calendar"
    finance = "finance"
    social = "social"
    screen_time = "screen_time"
    education = "education"
    tasks = "tasks"
    mood = "mood"
    family = "family"


class Horizon(str, Enum):
    tactical = "tactical"      # next 24 hours
    strategic = "strategic"    # next 30 days
    life = "life"              # next 12 months


class Severity(str, Enum):
    info = "info"
    notice = "notice"
    warning = "warning"
    critical = "critical"


class ActionType(str, Enum):
    simplify_schedule = "simplify_schedule"
    reschedule_meeting = "reschedule_meeting"
    book_appointment = "book_appointment"
    order_groceries = "order_groceries"
    draft_message = "draft_message"
    review_budget = "review_budget"
    recovery_suggestion = "recovery_suggestion"
    reconnect_contact = "reconnect_contact"


class ActionStatus(str, Enum):
    proposed = "proposed"
    approved = "approved"
    executed = "executed"
    auto_executed = "auto_executed"
    overridden = "overridden"
    rejected = "rejected"


# Life-state dimension keys (0.0 = low, 1.0 = high).
DIM_STRESS = "stress"
DIM_ENERGY = "energy"
DIM_FOCUS = "focus"
DIM_FINANCIAL_PRESSURE = "financial_pressure"
DIM_SOCIAL_CONNECTEDNESS = "social_connectedness"
DIM_PHYSICAL_READINESS = "physical_readiness"

ALL_DIMENSIONS = [
    DIM_STRESS,
    DIM_ENERGY,
    DIM_FOCUS,
    DIM_FINANCIAL_PRESSURE,
    DIM_SOCIAL_CONNECTEDNESS,
    DIM_PHYSICAL_READINESS,
]


# ── Signals ───────────────────────────────────────────────────────────
class SignalIn(BaseModel):
    domain: SignalDomain
    metric: str = Field(..., description="Metric name, e.g. 'resting_heart_rate'")
    value: float = Field(..., description="Numeric value of the metric")
    unit: Optional[str] = None
    source: Optional[str] = Field(None, description="Origin, e.g. 'wearable', 'calendar-sync'")
    timestamp: Optional[datetime] = None


class SignalBatchIn(BaseModel):
    user_id: str
    signals: List[SignalIn]


class Signal(BaseModel):
    user_id: str
    domain: SignalDomain
    metric: str
    value: float
    unit: Optional[str] = None
    source: Optional[str] = None
    timestamp: datetime = Field(default_factory=utcnow)


# ── Life-state model ──────────────────────────────────────────────────
class DimensionScore(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0, description="How much data backs this score")


class LifeState(BaseModel):
    user_id: str
    dimensions: Dict[str, DimensionScore]
    overall_wellbeing: float = Field(..., ge=0.0, le=1.0)
    summary_label: str
    signal_count: int
    computed_at: datetime = Field(default_factory=utcnow)


# ── Tasks / prioritisation ────────────────────────────────────────────
class TaskIn(BaseModel):
    id: Optional[str] = None
    title: str
    domain: SignalDomain = SignalDomain.tasks
    urgency: float = Field(0.5, ge=0.0, le=1.0)
    importance: float = Field(0.5, ge=0.0, le=1.0)
    demand: float = Field(0.5, ge=0.0, le=1.0, description="Cognitive/physical load required")
    due_at: Optional[datetime] = None


class RankedTask(BaseModel):
    id: str
    title: str
    domain: SignalDomain
    score: float
    recommendation: str = Field(..., description="'today' or 'defer'")
    reason: str


# ── Cross-domain recommendations & conflicts ──────────────────────────
class DomainRecommendationIn(BaseModel):
    domain: SignalDomain
    action: str
    category: str = Field(..., description="e.g. exertion, recovery, spend, save, work, rest, social")
    intensity: float = Field(0.5, ge=0.0, le=1.0)
    rationale: Optional[str] = None


class Conflict(BaseModel):
    domains: List[str]
    description: str
    winning_domain: str
    resolution: str
    rationale: str


# ── Insights (decision engine, 3 horizons) ────────────────────────────
class Insight(BaseModel):
    horizon: Horizon
    title: str
    detail: str
    severity: Severity = Severity.info
    category: str = "general"
    recommended_action: Optional[str] = None


# ── Proactive actions & immutable log ─────────────────────────────────
class ProactiveAction(BaseModel):
    id: str
    user_id: str
    type: ActionType
    description: str
    rationale: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    status: ActionStatus
    requires_approval: bool
    created_at: datetime = Field(default_factory=utcnow)
    executed_at: Optional[datetime] = None
    overridden_at: Optional[datetime] = None
    source_insight: Optional[str] = None


class ActionLogEntry(BaseModel):
    action_id: str
    user_id: str
    event: str
    at: datetime = Field(default_factory=utcnow)
    note: Optional[str] = None


# ── Briefing ──────────────────────────────────────────────────────────
class Briefing(BaseModel):
    user_id: str
    text: str
    generated_by: str = Field(..., description="Model id, or 'template' when the router was unavailable")
    created_at: datetime = Field(default_factory=utcnow)


# ── Orchestration cycle ───────────────────────────────────────────────
class OrchestrateRequest(BaseModel):
    tasks: List[TaskIn] = Field(default_factory=list)
    domain_recommendations: List[DomainRecommendationIn] = Field(default_factory=list)
    auto_execute: bool = Field(False, description="Auto-execute pre-authorised low-risk actions")


class CycleResult(BaseModel):
    user_id: str
    life_state: LifeState
    insights: List[Insight]
    conflicts: List[Conflict]
    ranked_tasks: List[RankedTask]
    proposed_actions: List[ProactiveAction]
    briefing: Briefing
    generated_at: datetime = Field(default_factory=utcnow)


# ── Action mutation requests ──────────────────────────────────────────
class ActionNote(BaseModel):
    note: Optional[str] = None

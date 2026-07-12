import os

# Must be set BEFORE importing anything that reads config (settings is a singleton).
os.environ["ENABLE_SCHEDULER"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from src import router_client as rc_module  # noqa: E402
from src.action_engine import approve_action, override_action, propose_actions  # noqa: E402
from src.briefing import generate_briefing  # noqa: E402
from src.conflict_resolver import resolve_conflicts  # noqa: E402
from src.decision_engine import generate_insights  # noqa: E402
from src.life_state import build_life_state  # noqa: E402
from src.models import (  # noqa: E402
    ALL_DIMENSIONS,
    DIM_STRESS,
    ActionStatus,
    ActionType,
    DimensionScore,
    DomainRecommendationIn,
    Horizon,
    Insight,
    LifeState,
    Severity,
    Signal,
    SignalDomain,
    TaskIn,
)
from src.priority_engine import rank_tasks  # noqa: E402
from src.repository import repository  # noqa: E402


# ── Helpers ───────────────────────────────────────────────────────────
@pytest.fixture(autouse=True)
def _reset_repository():
    repository._signals.clear()
    repository._life_states.clear()
    repository._briefings.clear()
    repository._actions.clear()
    repository._action_log.clear()
    yield


def latest(metrics: dict) -> dict:
    return {
        m: Signal(user_id="u", domain=SignalDomain.health, metric=m, value=v)
        for m, v in metrics.items()
    }


def life_state_with(stress: float, **overrides) -> LifeState:
    dims = {}
    for d in ALL_DIMENSIONS:
        score = stress if d == DIM_STRESS else overrides.get(d, 0.5)
        dims[d] = DimensionScore(score=score, confidence=1.0)
    return LifeState(
        user_id="u", dimensions=dims, overall_wellbeing=0.5,
        summary_label="x", signal_count=1,
    )


@pytest.fixture
def client():
    import main
    with TestClient(main.app) as c:
        yield c


# ── Life-state builder ────────────────────────────────────────────────
def test_life_state_detects_stress_cascade():
    ls = build_life_state("u", latest({
        "resting_heart_rate": 95,
        "hrv": 25,
        "late_night_minutes": 90,
        "overdue_tasks": 12,
        "calendar_density": 0.9,
        "sleep_hours": 4,
    }))
    assert ls.dimensions[DIM_STRESS].score >= 0.6
    assert ls.dimensions[DIM_STRESS].confidence > 0
    assert ls.summary_label == "stressed"


def test_life_state_healthy_signals():
    ls = build_life_state("u", latest({
        "resting_heart_rate": 55,
        "hrv": 85,
        "sleep_hours": 8,
        "recovery_score": 85,
        "social_interactions_today": 8,
        "mood_score": 0.9,
        "overdue_tasks": 0,
        "calendar_density": 0.2,
    }))
    assert ls.dimensions[DIM_STRESS].score < 0.4
    assert ls.overall_wellbeing > 0.55
    assert ls.summary_label in ("energized", "balanced")


def test_unknown_dimensions_are_neutral_with_zero_confidence():
    ls = build_life_state("u", latest({"resting_heart_rate": 70}))
    fin = ls.dimensions["financial_pressure"]
    assert fin.score == 0.5 and fin.confidence == 0.0  # no financial signals


# ── Priority engine ───────────────────────────────────────────────────
def test_priority_defers_demanding_task_under_stress():
    ls = life_state_with(0.8)
    ranked = rank_tasks([
        TaskIn(id="hard", title="Deep strategy doc", urgency=0.4, importance=0.6, demand=0.9),
        TaskIn(id="crit", title="Pay overdue invoice", urgency=0.9, importance=0.8, demand=0.5),
    ], ls)
    by_id = {r.id: r for r in ranked}
    assert by_id["hard"].recommendation == "defer"
    assert by_id["crit"].recommendation == "today"  # critical urgency is never deferred


def test_priority_keeps_demanding_task_when_calm():
    ls = life_state_with(0.1)
    ranked = rank_tasks([TaskIn(id="hard", title="Deep work", urgency=0.6, importance=0.8, demand=0.9)], ls)
    assert ranked[0].recommendation == "today"


# ── Conflict resolver ─────────────────────────────────────────────────
def test_health_beats_fitness_conflict():
    conflicts = resolve_conflicts([
        DomainRecommendationIn(domain=SignalDomain.fitness, action="Heavy squats", category="exertion", intensity=0.9),
        DomainRecommendationIn(domain=SignalDomain.health, action="Rest, inflammation high", category="recovery", intensity=0.6),
    ])
    assert len(conflicts) == 1
    assert conflicts[0].winning_domain == "health"
    assert "recovery" in conflicts[0].resolution.lower()


def test_no_conflict_for_non_opposing_categories():
    conflicts = resolve_conflicts([
        DomainRecommendationIn(domain=SignalDomain.fitness, action="Train", category="exertion", intensity=0.9),
        DomainRecommendationIn(domain=SignalDomain.social, action="Call a friend", category="social", intensity=0.5),
    ])
    assert conflicts == []


# ── Decision engine ───────────────────────────────────────────────────
def test_insights_cover_all_three_horizons_and_flag_stress():
    ls = life_state_with(0.8)
    insights = generate_insights(ls, history=[ls], conflicts=[], ranked_tasks=[])
    horizons = {i.horizon for i in insights}
    assert {Horizon.tactical, Horizon.strategic, Horizon.life} <= horizons
    tactical = [i for i in insights if i.horizon == Horizon.tactical]
    assert any(i.recommended_action == ActionType.simplify_schedule.value for i in tactical)


# ── Action engine + immutable log ─────────────────────────────────────
def _stress_insight():
    return Insight(
        horizon=Horizon.tactical, title="Elevated stress", detail="High stress detected.",
        severity=Severity.warning, recommended_action=ActionType.simplify_schedule.value,
    )


def test_action_lifecycle_and_append_only_log():
    ls = life_state_with(0.8)
    actions = propose_actions("u", [_stress_insight()], ls, auto_execute=False)
    assert len(actions) == 1
    act = actions[0]
    assert act.type == ActionType.simplify_schedule
    assert act.status == ActionStatus.proposed

    assert approve_action(act.id).status == ActionStatus.executed
    assert override_action(act.id).status == ActionStatus.overridden

    with pytest.raises(ValueError):  # already overridden
        override_action(act.id)

    events = [e.event for e in repository.log_for_action(act.id)]
    assert events == ["proposed", "approved", "executed", "overridden"]


def test_low_risk_auto_executes_but_high_risk_needs_approval():
    ls = life_state_with(0.8)
    low = propose_actions("u", [_stress_insight()], ls, auto_execute=True)
    assert low[0].status == ActionStatus.auto_executed

    repository._actions.clear()
    high_insight = Insight(
        horizon=Horizon.tactical, title="Book a check-up", detail="Signals suggest a visit.",
        severity=Severity.warning, recommended_action=ActionType.book_appointment.value,
    )
    high = propose_actions("u", [high_insight], ls, auto_execute=True)
    assert high[0].requires_approval is True
    assert high[0].status == ActionStatus.proposed  # not auto-executed despite opt-in


def test_cannot_approve_twice():
    ls = life_state_with(0.8)
    act = propose_actions("u", [_stress_insight()], ls)[0]
    approve_action(act.id)
    with pytest.raises(ValueError):
        approve_action(act.id)


# ── Briefing ──────────────────────────────────────────────────────────
async def test_briefing_falls_back_to_template(monkeypatch):
    async def fake_generate(*a, **k):
        return None
    monkeypatch.setattr(rc_module.router_client, "generate", fake_generate)
    b = await generate_briefing("u", life_state_with(0.7), [], [], [], [])
    assert b.generated_by == "template"
    assert "briefing" in b.text.lower()


async def test_briefing_uses_router_when_available(monkeypatch):
    async def fake_generate(*a, **k):
        return {"response_text": "You're steady today — one thing matters.", "routed_model": "claude-3-5-sonnet"}
    monkeypatch.setattr(rc_module.router_client, "generate", fake_generate)
    b = await generate_briefing("u", life_state_with(0.3), [], [], [], [])
    assert b.generated_by == "claude-3-5-sonnet"
    assert b.text == "You're steady today — one thing matters."


# ── End-to-end API ────────────────────────────────────────────────────
def test_orchestrate_end_to_end(client, monkeypatch):
    async def fake_generate(*a, **k):
        return None  # force deterministic template briefing (no network)
    monkeypatch.setattr(rc_module.router_client, "generate", fake_generate)

    client.post("/signals/batch", json={
        "user_id": "alice",
        "signals": [
            {"domain": "health", "metric": "resting_heart_rate", "value": 95},
            {"domain": "health", "metric": "hrv", "value": 25},
            {"domain": "tasks", "metric": "overdue_tasks", "value": 10},
            {"domain": "screen_time", "metric": "late_night_minutes", "value": 80},
        ],
    })

    resp = client.post("/orchestrate/alice", json={
        "tasks": [{"title": "Write big report", "urgency": 0.3, "importance": 0.6, "demand": 0.9}],
        "domain_recommendations": [
            {"domain": "fitness", "action": "Heavy session", "category": "exertion", "intensity": 0.9},
            {"domain": "health", "action": "Rest", "category": "recovery", "intensity": 0.6},
        ],
        "auto_execute": False,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["life_state"]["summary_label"] == "stressed"
    assert len(data["conflicts"]) == 1 and data["conflicts"][0]["winning_domain"] == "health"
    assert data["briefing"]["generated_by"] == "template"
    horizons = {i["horizon"] for i in data["insights"]}
    assert {"tactical", "strategic", "life"} <= horizons
    assert any(t["recommendation"] == "defer" for t in data["ranked_tasks"])

    assert client.get("/briefing/alice").status_code == 200
    actions = client.get("/actions/alice").json()
    assert len(actions) >= 1

    # Approve then override an action through the API.
    action_id = actions[0]["id"]
    approved = client.post(f"/actions/{action_id}/approve")
    assert approved.status_code == 200 and approved.json()["status"] == "executed"
    overridden = client.post(f"/actions/{action_id}/override")
    assert overridden.status_code == 200 and overridden.json()["status"] == "overridden"


def test_signal_ingest_and_life_state_endpoint(client):
    assert client.post("/signals/bob", json={"domain": "health", "metric": "hrv", "value": 80}).status_code == 202
    ls = client.get("/life-state/bob")
    assert ls.status_code == 200
    assert ls.json()["user_id"] == "bob"
    assert "bob" in client.get("/admin/active-users").json()["users"]


def test_briefing_404_before_first_cycle(client):
    assert client.get("/briefing/nobody").status_code == 404

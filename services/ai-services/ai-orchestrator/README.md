# AI Life Orchestrator

The persistent meta-agent that sits **above** the domain AI agents (health, education,
finance, social, …) and coordinates them into one coherent, proactive picture of the
user's life — the PDF's "central nervous system … every other module connects through it."

- **Framework:** Python / FastAPI · **Port:** `4700`
- **Reasons through:** `ai-model-router` (every LLM call is routed, costed, audited)
- **Persistence:** in-memory repository behind a swappable interface (see below)

## What it does (per the vision doc)

1. **Real-time life-state model** — synthesises the latest signal per metric (heart rate,
   sleep, calendar density, overdue tasks, cash-flow, social activity, screen time, mood …)
   into six probabilistic dimensions: **stress, energy, focus, financial_pressure,
   social_connectedness, physical_readiness** — each with a confidence. Dimensions with no
   backing signals stay neutral (0.5, confidence 0) rather than faking certainty.
2. **Priority-ranking engine** — weighs urgency, importance and *emotional readiness*
   (readiness = 1 − stress). Under stress protection it defers demanding, non-critical tasks
   instead of piling them on ("it will not add more tasks to your plate").
3. **Cross-domain conflict resolution** — opposing recommendations (e.g. fitness *exertion*
   vs health *recovery*) are detected; the higher-priority domain (health/family outrank
   fitness/social) wins and a concrete compromise is produced.
4. **Decision engine — three horizons** — tactical (24h, current state), strategic (30d,
   trend across snapshots) and life (12m, sustained patterns).
5. **Daily briefing** — composes the above into a warm, concise briefing via the model
   router; falls back to a deterministic template when the router is unavailable.
6. **Proactive action log** — proposes pre-authorised actions; high-risk ones need approval,
   low-risk ones can auto-execute on opt-in. Every state change is written to an **append-only
   log**, and any executed action can be **overridden within 24 hours**.
7. **Continuous loop** — a background scheduler re-runs the full cycle for every active user
   every 15 minutes (configurable), so state, briefings and actions stay current.

## Orchestration cycle

```
signals ─▶ life-state ─▶ conflict resolution ─▶ priority ranking
                         └▶ decision engine (3 horizons) ─▶ proactive actions ─▶ briefing (router)
```

## HTTP API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness + scheduler status |
| `POST` | `/signals/batch` | Ingest many signals `{user_id, signals[]}` |
| `POST` | `/signals/{user_id}` | Ingest one signal |
| `GET` | `/life-state/{user_id}` | Compute the current life-state |
| `GET` | `/life-state/{user_id}/history` | Life-state snapshots (for trends) |
| `POST` | `/orchestrate/{user_id}` | Run a full cycle now. Body: `tasks[]`, `domain_recommendations[]`, `auto_execute` → `CycleResult` |
| `GET` | `/insights/{user_id}` | Insights across the three horizons |
| `GET` | `/briefing/{user_id}` | Latest daily briefing |
| `GET` | `/actions/{user_id}` | Proposed / taken actions |
| `GET` | `/actions/{user_id}/log` | Append-only action log |
| `POST` | `/actions/{action_id}/approve` | Approve → execute a proposed action |
| `POST` | `/actions/{action_id}/reject` | Reject a proposed action |
| `POST` | `/actions/{action_id}/override` | Undo an executed action (within 24h) |
| `GET` | `/admin/active-users` | Users with signals on record |

### Example

```bash
curl -X POST localhost:4700/signals/batch -H 'content-type: application/json' -d '{
  "user_id":"alice",
  "signals":[
    {"domain":"health","metric":"resting_heart_rate","value":95},
    {"domain":"health","metric":"hrv","value":25},
    {"domain":"tasks","metric":"overdue_tasks","value":10},
    {"domain":"screen_time","metric":"late_night_minutes","value":80}
  ]}'

curl -X POST localhost:4700/orchestrate/alice -H 'content-type: application/json' -d '{
  "tasks":[{"title":"Write big report","urgency":0.3,"importance":0.6,"demand":0.9}],
  "domain_recommendations":[
    {"domain":"fitness","action":"Heavy session","category":"exertion","intensity":0.9},
    {"domain":"health","action":"Rest","category":"recovery","intensity":0.6}
  ]}'
# → life-state "stressed", the report is deferred, the exertion/recovery conflict
#   resolves in health's favour, and a briefing + proactive actions are returned.
```

## Signals the life-state understands

`resting_heart_rate`, `hrv`, `sleep_hours`, `recovery_score`, `training_load`,
`inflammation_marker`, `late_night_minutes`, `screen_time_hours`, `overdue_tasks`,
`calendar_density`, `notifications_per_hour`, `task_switches_per_hour`,
`cash_flow_gap_days`, `balance_trend`, `upcoming_bills_ratio`,
`social_interactions_today`, `neglected_contacts`, `messages_exchanged`, `mood_score`.
Each is normalised and mapped to one or more dimensions in `src/life_state.py`.

## Architecture

`src/` — `life_state.py` (signal→state), `priority_engine.py`, `conflict_resolver.py`,
`decision_engine.py` (3 horizons), `action_engine.py` (+ immutable log), `briefing.py`
(router-backed, template fallback), `orchestrator.py` (cycle), `scheduler.py` (15-min loop),
`router_client.py`, `repository.py` (in-memory; swap for Postgres/Redis without touching the
engines), `models.py`, `config.py`.

## Environment

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4700` | HTTP port |
| `AI_MODEL_ROUTER_URL` | `http://localhost:4703` | Model router for briefing generation |
| `ORCHESTRATION_INTERVAL_SEC` | `900` | Background loop cadence (15 min) |
| `ENABLE_SCHEDULER` | `true` | Toggle the background loop (set `false` in tests) |
| `STRESS_PROTECTION_THRESHOLD` | `0.6` | Stress level above which demanding tasks are deferred |

## Data sensitivity

**Sensitive** — the orchestrator aggregates health, financial, family and behavioural
signals. All LLM reasoning is routed with `privacy_sensitivity=sensitive`; child users must
route through the strict-sovereign path once wired to domain agents.

## Connected services (target)

`ai-health`, `ai-education`, `ai-fitness-life`, `ai-finance-business-growth`,
`ai-family-safety`, `ai-emotion`, `ai-memory`, `ai-predictive-crisis`, `ai-digital-twin`,
`notification-service`, `audit-compliance-service`. These domain agents are not yet built;
today the orchestrator consumes signals and domain recommendations pushed via its API.

## Run & test

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 4700      # or: python main.py
python -m pytest -q                        # 16 tests
```

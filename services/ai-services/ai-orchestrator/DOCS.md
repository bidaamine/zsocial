# AI Life Orchestrator — Complete Reference

Everything about the service: how to run it, how it works internally, and the full API.
For the short overview see [README.md](./README.md).

---

## 1. What it is

The AI Life Orchestrator is the platform's **meta-agent**. It sits above the domain AI
agents (health, education, fitness, finance, social, family, emotion) and turns a stream
of raw signals into one coherent, proactive picture of a user's life — then coordinates,
prioritises, and (with permission) acts.

It is **stateless of any external database today** (in-memory repository) and does all its
LLM reasoning **through the `ai-model-router`**, so every model call is classified, costed
and audited centrally.

---

## 2. How to run it

### 2.1 Local (Python)

```bash
cd services/ai-services/ai-orchestrator
python -m venv .venv && . .venv/Scripts/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # optional; defaults are fine
uvicorn main:app --reload --port 4700                   # or: python main.py
```

Health check:

```bash
curl localhost:4700/health
# {"status":"healthy","service":"ai-orchestrator","scheduler_enabled":true, ...}
```

The service starts a **background loop** on boot (every `ORCHESTRATION_INTERVAL_SEC`,
default 900s). Set `ENABLE_SCHEDULER=false` to disable it (tests do this).

### 2.2 Docker

```bash
cd services/ai-services/ai-orchestrator
docker build -t nexus/ai-orchestrator .
docker run --rm -p 4700:4700 \
  -e AI_MODEL_ROUTER_URL=http://host.docker.internal:4703 \
  nexus/ai-orchestrator
```

The orchestrator does **not** need the `infra/local/docker-compose.yml` stack — it holds
state in memory and only needs the model router reachable (and even that is optional: with
the router down, briefings fall back to a deterministic template).

### 2.3 Dependencies at runtime

| Dependency | Required? | Behaviour if absent |
|---|---|---|
| `ai-model-router` (HTTP) | optional | Briefings use a deterministic template instead of an LLM |
| Postgres / Redis / Kafka | not used | — (in-memory persistence) |

---

## 3. Configuration (env vars)

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4700` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `ENV` | `local` | Environment label |
| `AI_MODEL_ROUTER_URL` | `http://localhost:4703` | Model router base URL |
| `AUDIT_SERVICE_URL` | `http://localhost:4109` | Reserved for future audit hooks |
| `REQUEST_TIMEOUT_SEC` | `10.0` | Router HTTP timeout |
| `ORCHESTRATION_INTERVAL_SEC` | `900` | Background loop cadence (15 min) |
| `ENABLE_SCHEDULER` | `true` | Toggle the background loop |
| `SIGNAL_FRESHNESS_SEC` | `86400` | Signals older than this are ignored for the current life-state |
| `LIFE_STATE_HISTORY` | `96` | Snapshots retained per user (trend analysis) |
| `PRIORITY_URGENCY_WEIGHT` | `0.45` | Priority engine weight |
| `PRIORITY_IMPORTANCE_WEIGHT` | `0.35` | Priority engine weight |
| `PRIORITY_READINESS_WEIGHT` | `0.20` | Priority engine weight |
| `STRESS_PROTECTION_THRESHOLD` | `0.6` | Stress ≥ this defers demanding, non-critical tasks |

---

## 4. Architecture & module map

```
main.py                     FastAPI app, routes, lifespan (starts/stops the scheduler)
src/
  config.py                 Settings from env
  models.py                 Pydantic schemas + enums
  timeutil.py               timezone-aware UTC helpers
  repository.py             in-memory stores (signals, life-state history, briefings, actions, log)
  router_client.py          resilient HTTP client for ai-model-router
  life_state.py             signals -> life-state (dimension math)
  priority_engine.py        urgency x importance x emotional readiness
  conflict_resolver.py      cross-domain conflict detection + resolution
  decision_engine.py        insights across 3 horizons
  action_engine.py          proactive actions + append-only log + 24h override
  briefing.py               router-backed briefing, template fallback
  orchestrator.py           run_cycle(): ties the engines together
  scheduler.py              background 15-minute loop
```

### The orchestration cycle (`run_cycle`)

```
1. build life-state from the latest signal per metric   (life_state.py)  -> persist snapshot
2. resolve cross-domain conflicts                        (conflict_resolver.py)
3. rank tasks by urgency/importance/readiness            (priority_engine.py)
4. generate insights across tactical/strategic/life      (decision_engine.py)
5. propose proactive actions from insight recommendations(action_engine.py)
6. generate the daily briefing via the router            (briefing.py)     -> persist briefing
```

---

## 5. The life-state model

`build_life_state(user_id, latest_by_metric)` produces six **dimensions**, each a
`{score: 0..1, confidence: 0..1}`:

| Dimension | Meaning (1.0 = high) |
|---|---|
| `stress` | Physiological + situational stress load |
| `energy` | Available energy / alertness |
| `focus` | Ability to concentrate (low interruption load) |
| `financial_pressure` | Cash-flow / obligation pressure |
| `social_connectedness` | Recent meaningful social contact |
| `physical_readiness` | Recovery / capacity for physical exertion |

Plus a scalar `overall_wellbeing` and a `summary_label`
(`stressed`, `financially-strained`, `socially-withdrawn`, `energized`, `balanced`, `low`).

### 5.1 Signal → dimension mapping

Each metric is normalised to 0..1 across `[lo, hi]`; `invert` means a high raw value
lowers the dimension. Defined in `src/life_state.py`:

| Metric | Range | Affects (weight, invert) |
|---|---|---|
| `resting_heart_rate` | 50–100 | stress (1.0), physical_readiness (0.7, inv) |
| `hrv` | 20–100 | stress (0.8, inv), physical_readiness (1.0), energy (0.5) |
| `sleep_hours` | 0–9 | energy (1.0), physical_readiness (0.8), stress (0.4, inv) |
| `recovery_score` | 0–100 | physical_readiness (1.0), energy (0.7) |
| `training_load` | 0–100 | physical_readiness (0.8, inv) |
| `inflammation_marker` | 0–10 | physical_readiness (1.0, inv), stress (0.3) |
| `late_night_minutes` | 0–120 | stress (0.8), energy (0.7, inv) |
| `screen_time_hours` | 0–12 | focus (0.5, inv), stress (0.3) |
| `overdue_tasks` | 0–15 | stress (1.0), focus (0.7, inv) |
| `calendar_density` | 0–1 | stress (0.9), focus (0.6, inv), energy (0.3, inv) |
| `notifications_per_hour` | 0–60 | focus (1.0, inv) |
| `task_switches_per_hour` | 0–40 | focus (0.8, inv) |
| `cash_flow_gap_days` | 0–60 | financial_pressure (1.0, inv) |
| `balance_trend` | -1–1 | financial_pressure (0.7, inv) |
| `upcoming_bills_ratio` | 0–2 | financial_pressure (0.8) |
| `social_interactions_today` | 0–15 | social_connectedness (1.0) |
| `neglected_contacts` | 0–10 | social_connectedness (0.8, inv) |
| `messages_exchanged` | 0–50 | social_connectedness (0.5) |
| `mood_score` | 0–1 | stress (0.7, inv), energy (0.4) |

**Score** = weighted mean of contributions. **Confidence** = fraction of a dimension's
defined metric-effects that were actually present. Dimensions with no signals default to
`score 0.5, confidence 0` — the model never invents certainty.

**Wellbeing** = weighted roll-up: stress 0.25 (inv), energy 0.20, physical_readiness 0.15,
financial_pressure 0.15 (inv), social 0.15, focus 0.10.

---

## 6. Priority engine

For each task: `score = 0.45·urgency + 0.35·importance + 0.20·readiness − (1−readiness)·demand·0.5`
where `readiness = 1 − stress`.

- `urgency ≥ 0.85` → always **today** (critical, never deferred).
- Under stress protection (`stress ≥ 0.6`) a task with `demand ≥ 0.6` → **defer**.
- Otherwise `score ≥ 0.5` → today, else defer.

Result is sorted by score descending.

---

## 7. Conflict resolution

Recommendations carry a `category`. Opposing pairs — `exertion↔recovery`, `spend↔save`,
`work↔rest`, `stimulate↔calm` — are conflicts. The higher-priority **domain** wins:

```
health(6) > family(5) > finance(4) > calendar(3) > education(2)=fitness(2) > tasks(1)=social(1) > screen_time(0)=mood(0)
```

Ties break on `intensity`. Each conflict returns the winning domain, a concrete compromise,
and a rationale.

---

## 8. Decision engine — three horizons

- **tactical (24h)** — from the current life-state (stress, readiness, finance, social, focus),
  deferred-task count, and resolved conflicts. Emits an "on track" all-clear if nothing fires.
- **strategic (30d)** — trend across life-state snapshots (recent-window mean − older-window
  mean of wellbeing and stress). Needs ≥4 snapshots, else a "building baseline" note.
- **life (12m)** — sustained patterns (long-run average stress / physical readiness).

Insights carry `{horizon, title, detail, severity, category, recommended_action?}`.

---

## 9. Action engine + immutable log

Insight `recommended_action` values become `ProactiveAction`s (deduped by type per cycle).

- **High-risk** (`book_appointment`, `order_groceries`, `reschedule_meeting`, `draft_message`)
  always require approval.
- **Low-risk** (`simplify_schedule`, `recovery_suggestion`, `review_budget`,
  `reconnect_contact`) may **auto-execute** when `auto_execute=true` and confidence ≥ 0.7.
- **Confidence** = severity base × (0.6 + 0.4 × avg dimension confidence).

**Statuses:** `proposed → approved → executed`, or `auto_executed`, or `rejected`, or
`overridden`. Every transition appends to an **append-only** log (`/actions/{user}/log`);
history is never mutated. An executed/auto-executed action can be **overridden within 24h**.

---

## 10. Briefing

`generate_briefing(...)` builds a structured context (life-state, insights by horizon,
conflicts, top-3 today tasks, proposed actions), asks the router for a ≤120-word warm
briefing (`task_type=generation`, `privacy_sensitivity=sensitive`), and on any failure
falls back to a deterministic template built from the same context. `generated_by` is the
routed model id, or `"template"`.

---

## 11. Full API reference

Base URL: `http://localhost:4700`

### GET /health
→ `200` `{status, service, environment, port, scheduler_enabled, orchestration_interval_sec, known_users}`

### POST /signals/batch
Body:
```json
{ "user_id": "alice", "signals": [
  {"domain":"health","metric":"resting_heart_rate","value":95,"source":"wearable"},
  {"domain":"tasks","metric":"overdue_tasks","value":10}
]}
```
→ `202` `{status:"accepted", user_id, count}`

### POST /signals/{user_id}
Body: `{"domain":"health","metric":"hrv","value":80,"unit":"ms","timestamp":"2026-07-12T08:00:00Z"}`
→ `202` `{status:"accepted", user_id, metric}`. `timestamp` optional; naive values are treated as UTC.

Valid `domain`: `health, fitness, calendar, finance, social, screen_time, education, tasks, mood, family`.

### GET /life-state/{user_id}
→ `200` `LifeState`:
```json
{"user_id":"alice","dimensions":{"stress":{"score":0.79,"confidence":0.44}, "...":{}},
 "overall_wellbeing":0.29,"summary_label":"stressed","signal_count":4,"computed_at":"..."}
```

### GET /life-state/{user_id}/history
→ `200` `LifeState[]` (oldest→newest, capped at `LIFE_STATE_HISTORY`).

### POST /orchestrate/{user_id}
Body (all fields optional):
```json
{ "tasks": [{"title":"Write report","urgency":0.3,"importance":0.6,"demand":0.9}],
  "domain_recommendations": [
    {"domain":"fitness","action":"Heavy session","category":"exertion","intensity":0.9},
    {"domain":"health","action":"Rest","category":"recovery","intensity":0.6}],
  "auto_execute": false }
```
→ `200` `CycleResult`:
```json
{"user_id":"alice","life_state":{...},"insights":[{"horizon":"tactical",...}],
 "conflicts":[{"winning_domain":"health","resolution":"...","...":""}],
 "ranked_tasks":[{"id":"...","recommendation":"defer","score":0.12,"reason":"..."}],
 "proposed_actions":[{"id":"act-...","type":"simplify_schedule","status":"proposed",...}],
 "briefing":{"text":"...","generated_by":"template"},"generated_at":"..."}
```

### GET /insights/{user_id}
→ `200` `Insight[]` across the three horizons (computed on demand).

### GET /briefing/{user_id}
→ `200` `Briefing`, or `404` if no cycle has run yet.

### GET /actions/{user_id}
→ `200` `ProactiveAction[]` (newest first).

### GET /actions/{user_id}/log
→ `200` `ActionLogEntry[]` — the append-only audit trail.

### POST /actions/{action_id}/approve · /reject · /override
Optional body `{"note":"..."}`.
- `approve`: `proposed → executed`. `409` if not `proposed`.
- `reject`: `proposed → rejected`. `409` if not `proposed`.
- `override`: executed/auto-executed → `overridden`. `409` if not overridable or past 24h.
- `404` if the action id is unknown.

### GET /admin/active-users
→ `200` `{users: [...], count}`.

---

## 12. Integration guide

- **Domain agents push signals** (`POST /signals/batch`) as they observe them (a wearable
  syncs HR/HRV, a finance agent posts `cash_flow_gap_days`, etc.).
- **Domain agents push recommendations** into `POST /orchestrate` `domain_recommendations`
  so the orchestrator can resolve cross-domain conflicts.
- **Downstream (e.g. notification-service)** should consume proactive actions — poll
  `GET /actions/{user}` or (future) subscribe to an emitted `orchestrator.action.proposed`
  event — and surface/execute them.
- **Auto-execution** is opt-in per request (`auto_execute`) and only ever applies to
  low-risk action types.

---

## 13. Testing

```bash
python -m pytest -q          # 16 tests
```

Covers: life-state stress-cascade & healthy paths, neutral-unknown dimensions, priority
deferral under stress, conflict resolution, 3-horizon insights, action lifecycle + append-only
log + double-override guard, auto-execute vs approval, briefing router/template paths, and a
full HTTP end-to-end cycle. `ENABLE_SCHEDULER=false` is set by the test module so the loop
never runs during tests.

---

## 14. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Briefing `generated_by` is always `"template"` | Router unreachable — check `AI_MODEL_ROUTER_URL` and that `ai-model-router` is up |
| `/signals/batch` returns 422 | Body must be `{user_id, signals:[...]}`; each signal needs `domain`, `metric`, `value` |
| Life-state all `0.5 / confidence 0` | No signals ingested yet, or all older than `SIGNAL_FRESHNESS_SEC` |
| Loop not running | `ENABLE_SCHEDULER=false`, or check logs for "Orchestration loop started" |
| Override returns 409 | Action isn't executed/auto-executed, or the 24h window has passed |

---

## 15. Known limitations

- **In-memory persistence** — state is lost on restart. The `repository` interface is the
  single seam to swap for Postgres/Redis.
- **Domain agents not yet wired** — signals/recommendations are pushed via API rather than
  pulled from live `ai-health`/`ai-emotion`/etc. (those services are being built separately).
- **Proactive actions are recorded, not executed** against real calendars/stores yet — they
  are surfaced for approval and for a downstream executor to act on.

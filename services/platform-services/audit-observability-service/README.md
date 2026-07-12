# Audit Observability Service

Write-Once-Read-Many (WORM) store for immutable audit events and EU-AI-Act-style AI-decision records with explainability metadata.

- **Framework:** NestJS (TypeScript) · **Port:** `4109`
- **Persistence:** PostgreSQL (TypeORM) — `audit_logs`, `ai_decisions`
- **Auth:** None — `TelemetryController` endpoints are unauthenticated.

## Responsibility
- Persist audit events write-once and reject any attempt to re-use an existing ID (`BadRequestException` "WORM violation").
- Persist AI decisions with model version, inputs, confidence, and a required `explanation` field for accountability.
- Enforce immutability at two layers: PostgreSQL `BEFORE UPDATE OR DELETE` triggers and a TypeORM `EntitySubscriber`.
- Expose read-back of individual audit / AI-decision records by event ID.

## HTTP API
Routes are declared on `@Controller('telemetry')`; there is no global prefix.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/telemetry/audit` | Write-once audit event `{ eventId, actor, action, resource }`. |
| GET | `/telemetry/audit/:eventId` | Read an audit event by ID. |
| POST | `/telemetry/ai-decision` | Write-once AI decision `{ eventId, modelVersion, inputs, decision, confidence, explanation }`. |
| GET | `/telemetry/ai-decision/:eventId` | Read an AI decision by ID. |

## Events (Kafka)
None active. A client (`AUDIT_CLIENT` via `KafkaModule.registerClient`) is registered in `app.module.ts` but is not injected or used anywhere — no producers or `@EventPattern` consumers exist.

## Data model
- **`audit_logs`** — `id` (varchar PK, caller-supplied), `actor` (indexed), `action`, `resource`, `timestamp` (`@CreateDateColumn`).
- **`ai_decisions`** — `id` (varchar PK), `model_version`, `inputs` (jsonb, nullable), `decision`, `confidence` (numeric 5,4), `explanation` (text), `timestamp` (`@CreateDateColumn`).

## Data sensitivity
Regulated / audit-grade data. Records may reference actors and AI inputs, so payloads can carry personal or sensitive content; immutability is a compliance requirement (SOX/HIPAA/EU AI Act style) rather than a convenience.

## Known gaps
- WORM triggers are (re)created on module init inside a try/catch; if the SQL fails it is only logged, so DB-layer protection may be silently absent (the ORM subscriber still applies for ORM-issued writes).
- Endpoints have no authentication or authorization.
- Uniqueness of `id` is checked with a read-then-write `findOne`, which is race-prone under concurrency (no unique-constraint transaction guard beyond the PK itself).
- DB connection settings are hardcoded in `app.module.ts` with `synchronize: true` (dev-only).

## Develop & test
```bash
pnpm --filter @nexus/audit-observability-service dev
pnpm --filter @nexus/audit-observability-service test
```

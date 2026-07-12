# Privacy Engine

Orchestrates GDPR "Right to Be Forgotten" cascading deletions, differential-privacy anonymization, and offline (backups / data lake / model) purges for the Zad platform.

- **Framework:** NestJS (TypeScript) · **Port:** `5100` (hybrid HTTP + Kafka microservice)
- **Persistence:** PostgreSQL (TypeORM) — `deletion_jobs`
- **Auth:** `ZeroTrustGuard` (RS256 JWT verified against the auth-service public key, applied per route)

## Responsibility
- Register GDPR deletion requests, track per-service completion, and mark jobs `COMPLETED`.
- Fan out deletion to online services over Kafka, then run offline cascades once they all report back.
- Anonymize arbitrary JSON payloads: strip PII keys and add Laplace differential-privacy noise to numeric fields.
- Wipe residual user data from local `backups`, `datalake`, and `models` directories.

## HTTP API
Routes are declared on `@Controller('api/privacy')`; there is no global prefix (`setGlobalPrefix` is not called).

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/privacy/anonymize` | Anonymize a payload; optional `epsilon` (default `0.5`) controls noise. |
| POST | `/api/privacy/delete-account` | Register a deletion job for the caller (or another user if caller has `admin` role). |
| GET | `/api/privacy/deletion-status/:jobId` | Fetch a job's status (owner or `admin` only). |

## Events (Kafka)
Consumer group `privacy-engine-group`; broker from `KAFKA_BROKER` (default `localhost:9092`).

| Topic | Direction | Handler |
| --- | --- | --- |
| `auth.user.deleted` | inbound | `PrivacyKafkaController.handleAuthUserDeleted` |
| `consent.user.deleted` | inbound | `PrivacyKafkaController.handleConsentUserDeleted` |
| `profile.user.deleted` | inbound | `PrivacyKafkaController.handleProfileUserDeleted` |
| `safety.user.deleted` | inbound | `PrivacyKafkaController.handleSafetyUserDeleted` |
| `social.user.deleted` | inbound | `PrivacyKafkaController.handleSocialUserDeleted` |
| `gdpr.user.deletion.requested` | outbound | Emitted by `DeletionQueueService.registerDeletionRequest` |

## Data model
- **`deletion_jobs`** — `id` (uuid PK), `user_id` (indexed), `requested_at`, `completed_at` (nullable), `status` (`PENDING`/`IN_PROGRESS`/`COMPLETED`/`FAILED`), `progress` (jsonb map of per-step booleans: auth, consent, profile, safety, social, backups, datalake, models).

## Data sensitivity
Handles highly sensitive data: identifiers of users exercising erasure rights and any PII inside anonymization payloads. Raw payloads are transformed in memory and never persisted; only job metadata (not user content) is stored.

## Known gaps
- Offline cascades (`CascadingWipeService`) operate on **local filesystem directories** (`GDPR_BACKUPS_DIR`/`./backups`, `GDPR_DATALAKE_DIR`/`./datalake`, `GDPR_MODELS_DIR`/`./models`) — not real backup systems, data warehouses, or model stores.
- Backup and data-lake purges rely on plain substring matching of `userId` against file contents, which can over- or under-match.
- DB connection settings are hardcoded in `app.module.ts` with `synchronize: true` (dev-only, not migration-safe).
- Kafka producer emit failures are logged and swallowed; there is no retry or dead-letter handling.

## Develop & test
```bash
pnpm --filter @nexus/privacy-engine dev
pnpm --filter @nexus/privacy-engine test
```

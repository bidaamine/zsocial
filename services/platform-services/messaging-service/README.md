# Messaging Service

Direct messaging with AES-256-GCM encrypted bodies, plus an AI "digital twin" that drafts messages on a user's behalf by calling the ai-model-router.

- **Framework:** NestJS (TypeScript) · **Port:** `4113` (override with `PORT`) · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `messages`, `message_drafts`
- **Auth:** `ZeroTrustGuard` — Bearer JWT verified with RS256 against the auth service's public key (`AUTH_SERVICE_URL`, default `http://localhost:4100`)

## Responsibility

- Stores 1:1 messages with bodies encrypted at rest using AES-256-GCM (per-message IV + auth tag); decrypts on history read.
- Exposes conversation history and a metadata-only log (no body/IV/auth tag) for pattern analysis.
- Runs an AI digital-twin drafting flow: expands a sender's intent into a polished message via the ai-model-router, with owner review/approve-and-send.
- Runs a GDPR deletion cascade (Kafka consumer) that purges all of a user's messages and drafts.

## HTTP API

All routes require a valid Bearer token; the caller's id comes from the token `sub` claim.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/messages` | Send a message (`{ receiverId, body }`); body is encrypted before storage |
| GET | `/api/messages/history/:targetUserId` | Decrypted conversation between caller and target, oldest first |
| GET | `/api/messages/metadata` | Caller's last 50 message metadata records (no content, IV, or auth tag) |
| POST | `/api/messages/draft` | AI-draft a message (`{ recipientId, draftedContent, confidenceScore? }`); `draftedContent` is the sender's intent |
| GET | `/api/messages/drafts` | Caller's pending (un-reviewed, unsent) drafts |
| POST | `/api/messages/drafts/:id/approve` | Approve a draft and send it as a real encrypted message (owner only) |

## Events (Kafka)

| Topic | Direction | Handler |
| --- | --- | --- |
| `gdpr.user.deletion.requested` | Inbound (consumer) | `handleGdprDeletion` → `deleteUserData(userId)` |

Runs in hybrid mode: the Kafka consumer (group `messaging-service-group`, broker `KAFKA_BROKER` / `localhost:9092`) starts alongside the HTTP server. No outbound events are emitted.

## AI Twin drafting

`createDraft` calls the ai-model-router at `POST {AI_MODEL_ROUTER_URL}/route` (default `http://localhost:4703`) with a drafting prompt and a 4s abort timeout. On success the router's `response_text` is stored with `aiGenerated=true` and confidence `0.9` (`0.7` if the router reported `fallback_triggered`). If the router is unreachable or returns empty, the raw sender intent is stored with `aiGenerated=false` and the caller-supplied confidence floor (default `0.3`) — the feature degrades instead of failing.

## Data model

- **Message** (`messages`) — `id` (uuid PK), `sender_id`, `receiver_id`, `encrypted_body` (text), `iv`, `auth_tag`, `sent_at`, `read_at` (nullable), `is_late_night` (bool), `message_length` (int).
- **MessageDraft** (`message_drafts`) — `id` (uuid PK), `owner_id`, `recipient_id`, `drafted_content` (text), `confidence_score` (float), `ai_generated` (bool), `reviewed_by_owner` (bool), `created_at`, `sent_at` (nullable).

## Data sensitivity

Sensitive / personal — message bodies are encrypted at rest with a platform-held key derived from `MSG_ENCRYPTION_SECRET`. Metadata (participants, timestamp, length, late-night flag) is stored in cleartext.

## Known gaps

- **"Threat-protection metadata" is not real threat scanning:** the only signals are `isLateNight` (hour ≥ 23 or < 5) and `messageLength`. There is no content moderation, abuse detection, or safeguarding analysis despite the metadata endpoint's framing.
- **Platform-held encryption, not E2E:** the server holds the key and can decrypt every message; the default secret is a hard-coded fallback and must be overridden via `MSG_ENCRYPTION_SECRET`.
- `read_at` is stored but never set — there is no read-receipt endpoint.
- `synchronize: true` and hard-coded local Postgres credentials are dev-only; not production-safe.
- No pagination on message history; metadata is fixed at the latest 50 records.

## Develop & test

```bash
pnpm --filter @nexus/messaging-service dev
pnpm --filter @nexus/messaging-service test
```

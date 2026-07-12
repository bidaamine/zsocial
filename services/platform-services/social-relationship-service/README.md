# Social Relationship Service

Manages the user social graph — connection requests, acceptances, blocks, mutual connections, and friend-of-friend recommendations — backed by PostgreSQL and mirrored into a Neo4j graph.

- **Framework:** NestJS (TypeScript) · **Port:** `4106` · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `user_connections`; Neo4j graph (`User` nodes with `PENDING`, `CONNECTED`, `BLOCKED` relationships)
- **Auth:** `ZeroTrustGuard` — Bearer JWT verified with RS256 against the auth service's public key (`AUTH_SERVICE_URL`, default `http://localhost:4100`)

## Responsibility

- Owns the relational source of truth for user-to-user connections (pending / accepted / blocked) in `user_connections`.
- Mirrors every mutation into Neo4j via Cypher (`MERGE` on connect/accept/block, `DETACH DELETE` on GDPR wipe) so graph queries stay in sync.
- Answers graph questions with Cypher: mutual connections between two users and friend-of-friend recommendations ranked by shared-connection count.
- Runs a GDPR deletion cascade (Kafka consumer) that purges a user's rows and detaches their graph node.

## HTTP API

All routes require a valid Bearer token; the caller's id comes from the token `sub` claim.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/social/connect` | Send a connection request (`{ receiverId }`); fails if a link already exists |
| POST | `/api/social/accept` | Accept a pending request (`{ requesterId }`) |
| POST | `/api/social/block` | Block a user (`{ targetId }`); creates or overwrites the link as `blocked` |
| GET | `/api/social/mutual/:userId` | Mutual connections between caller and `:userId` → `{ mutuals: string[] }` |
| GET | `/api/social/recommendations` | Friends-of-friends for the caller → `{ recommendations: [{ id, strength }] }` |
| GET | `/api/social/connections` | Caller's accepted connections → `{ connections: string[] }` |
| DELETE | `/api/social/connection/:targetId` | Remove a connection in both directions → `{ success: true }` |

## Events (Kafka)

| Topic | Direction | Handler |
| --- | --- | --- |
| `gdpr.user.deletion.requested` | Inbound (consumer) | `handleGdprDeletion` → `deleteUserData(userId)` |

Runs in hybrid mode: the Kafka consumer (group `social-relationship-service-group`, broker `KAFKA_BROKER` / `localhost:9092`) is started alongside the HTTP server. A `SOCIAL_CLIENT` producer is registered in the module but no outbound events are emitted yet.

## Data model

- **UserConnection** (`user_connections`) — `id` (uuid PK), `requester_id` (indexed), `receiver_id` (indexed), `status` (`pending` | `accepted` | `blocked`, default `pending`), `created_at`, `updated_at`.
- **Neo4j** — `User {id}` nodes linked by `PENDING`, `CONNECTED`, or `BLOCKED` relationships, kept in step with the SQL table.

## Data sensitivity

Personal data — social graph edges and connection status. No message content or profile PII is stored here; only user ids and relationship state.

## Known gaps

- **Neo4j sync is best-effort:** all Cypher runs through `runCypher`, which swallows errors and logs a warning if the graph DB is offline/unseeded. SQL and graph state can therefore drift; there is no reconciliation job.
- `getMutualConnections` / `getRecommendations` return empty arrays when Neo4j is unavailable — there is no SQL fallback for these graph queries.
- `synchronize: true` and hard-coded local Postgres/Neo4j credentials are dev-only; not production-safe.
- No pagination on connection/recommendation lists; recommendations are capped at 10 in Cypher.

## Develop & test

```bash
pnpm --filter @nexus/social-relationship-service dev
pnpm --filter @nexus/social-relationship-service test
```

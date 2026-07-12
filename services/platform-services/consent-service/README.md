# Consent Service

Authoritative store and real-time enforcer of per-user data-use consent (health-data-for-AI, marketing, third-party marketplace), with a deny-by-default policy.

- **Framework:** NestJS (TypeScript) · **Port:** `4104` (hybrid HTTP + Kafka microservice)
- **Persistence:** PostgreSQL (TypeORM) — table `consent_records`; Redis caches each user's record for 3600s.
- **Auth:** `ZeroTrustGuard` — verifies RS256 JWTs against the auth-service public key (fetched from `${AUTH_SERVICE_URL}/api/auth/public-key`, cached 24h) and populates `req.user = { sub, email, archetype, roles }`.

## Responsibility
- Records and updates a user's consent flags; callers may only read/write their own record unless they hold `admin` or `system` roles.
- Answers consent checks with a **deny-by-default** rule — a missing record or cache/DB miss resolves to `false`.
- Seeds a default (all-denied) record on `auth.user.registered`; deletes the record and emits `consent.user.deleted` on `gdpr.user.deletion.requested`.
- Emits `consent.user.updated` whenever consent changes, and keeps a Redis cache warm on read/write.
- Ships a reusable `ConsentEnforcementGuard` + `@RequireConsent()` decorator (exported) so other services can gate routes on a consent field; it resolves the user from `x-user-id` or `req.user.sub`.

## HTTP API
| Method | Path | Description |
| --- | --- | --- |
| GET | `/consent/check` | Check a consent field: `?userId=&action=` (self/admin/system) |
| POST | `/consent/update` | Update consent flags for a user (self/admin/system) |

Both routes are protected by `ZeroTrustGuard`. No `setGlobalPrefix`, so paths are not under `/api`.

## Events (Kafka)
Broker `KAFKA_BROKER` (default `localhost:9092`); consumer group `consent-service-group`.

| Topic | Direction | Handler / Source |
| --- | --- | --- |
| `auth.user.registered` | consume | `ConsentKafkaController` → `seedDefaultConsent` |
| `gdpr.user.deletion.requested` | consume | `ConsentKafkaController` → `deleteConsentAndNotify` |
| `consent.user.updated` | emit | on update / seed |
| `consent.user.deleted` | emit | after GDPR delete |

## Data model
- **consent_records** — `id` (uuid), `user_id` (unique, indexed), `allow_health_data_for_ai` (bool, default `false`), `allow_marketing` (bool, default `false`), `allow_third_party_marketplace` (bool, default `false`), `updated_at`.

## Data sensitivity
Regulated compliance metadata. The records themselves are permission flags rather than raw personal data, but they are the legal basis governing sensitive/health-data processing, marketing, and third-party sharing under GDPR-style regimes. Incorrect enforcement (fail-open) would authorize unlawful data use, so the service defaults to deny.

## Known gaps
- Database and Redis config are **hardcoded** (`localhost:5434` Postgres, `localhost:6379` Redis) with no env fallback.
- `synchronize: true` on TypeORM — dev-only schema auto-sync.
- `ConsentService` instantiates its own `ClientKafka` directly instead of via DI/`KafkaModule`.
- `ConsentEnforcementGuard` is exported for cross-service reuse but is not applied to any route within this service.
- Consent model is a fixed set of three boolean flags — no child/guardian consent or corporate-tenant policy despite the domain scope.

## Develop & test
```bash
pnpm --filter @nexus/consent-service dev
pnpm --filter @nexus/consent-service test
```

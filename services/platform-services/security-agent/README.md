# Security Agent

Zero-trust runtime for threat/risk scoring (rate + impossible-travel), and AES-256-GCM encryption of child data behind a parent-held key.

- **Framework:** NestJS (TypeScript) · **Port:** `4010`
- **Persistence:** Redis (via `@nexus/core-infra` `RedisModule`) for rate counters and travel history — no PostgreSQL/entities.
- **Auth:** `ZeroTrustGuard` (RS256 JWT + threat scoring) is implemented and exported, but **not applied** to `SecurityController` routes; the `ChildDataProtectionInterceptor` is registered globally via `APP_INTERCEPTOR`.

## Responsibility
- Score request risk from per-minute request rate and Haversine "impossible travel" between successive IPs (Redis-backed history).
- Encrypt/decrypt child-profile data with AES-256-GCM using a 32-byte (64-hex) parent key supplied per request.
- Transparently encrypt inbound / decrypt outbound sensitive fields (`bio`, `name`, `address`) for any request tagged `x-target-age-group: child`.
- Provide a reusable `ZeroTrustGuard` that blocks requests scoring >= 70.

## HTTP API
Routes are declared on `@Controller('security')`; there is no global prefix.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/security/assess-risk` | Compute a risk score (0–100) for `{ userId, action, ip? }`. |
| POST | `/security/encrypt-child` | AES-256-GCM encrypt `{ data }`; requires `x-parent-cryptographic-key` (64 hex chars). |
| POST | `/security/decrypt-child` | Decrypt `{ encryptedPayload }` with the same parent key header. |

## Events (Kafka)
None.

## Data model
No database entities. Runtime state in Redis:
- `security:rate:{userId}:{minute}` — request counter (120s TTL).
- `security:history:{userId}` — last `{ ip, lat, lon, timestamp }` for travel checks (7-day TTL).

## Data sensitivity
Processes child (minor) personal data and behavioral/security signals (IPs, request patterns). Child fields are encrypted with a key the platform receives per-request but does not persist; risk state in Redis is derived metadata, not raw PII.

## Known gaps
- **Geo coordinates are hardcoded**, not real GeoIP: localhost and a few IP prefixes map to fixed cities, everything else uses a deterministic hash of the IP octets — impossible-travel results are illustrative only.
- **"ZKP" is a simulation.** `ZkpService` performs symmetric AES-256-GCM encryption, not an actual zero-knowledge proof (the class comment says as much).
- `SecurityController` endpoints are **unauthenticated** — `ZeroTrustGuard` is never wired to them, so the parent key is the only gate on child crypto routes.
- The parent key is transmitted in a request header (`x-parent-cryptographic-key`) in cleartext to the service.
- Redis host/port are hardcoded in `app.module.ts`.

## Develop & test
```bash
pnpm --filter @nexus/security-agent dev
pnpm --filter @nexus/security-agent test
```

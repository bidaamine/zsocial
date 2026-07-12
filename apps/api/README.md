# API Gateway

The edge boundary for the NEXUS / Zad Social platform: a **zero-trust reverse proxy**
that authenticates every request (RS256) and forwards it to the right backend service.

- **Framework:** NestJS (TypeScript) · **Port:** `4000`
- **Auth:** `ZeroTrustGuard` (RS256 JWT verified against `auth-service`'s public key)
- **Protection:** `RateLimiterGuard` on all routes

## How routing works

Clients call `/api/route/:service/<downstream-path>`. The gateway verifies the token,
strips the `/api/route/:service` prefix, and proxies the remainder to the service's base
URL, forwarding the `Authorization` header plus `x-nexus-user-id` / `x-nexus-user-role`.

```
GET /api/route/company/api/companies      →  company-service  GET /api/companies
POST /api/route/family/api/families        →  family-service   POST /api/families
```

## Service registry

`apps/api/src/gateway-router.service.ts` — each entry is overridable via env var:

| `:service` | Target (default) | Env override |
|---|---|---|
| `auth` | `http://localhost:4100` | `AUTH_SERVICE_URL` |
| `profile` | `http://localhost:4103` | `PROFILE_SERVICE_URL` |
| `family` | `http://localhost:4101` | `FAMILY_SERVICE_URL` |
| `content` | `http://localhost:4112` | `CONTENT_SERVICE_URL` |
| `messaging` | `http://localhost:4113` | `MESSAGING_SERVICE_URL` |
| `media` | `http://localhost:4107` | `MEDIA_SERVICE_URL` |
| `notify` | `http://localhost:4105` | `NOTIFY_SERVICE_URL` |
| `company` | `http://localhost:4120` | `COMPANY_SERVICE_URL` |
| `branding` | `http://localhost:4121` | `BRANDING_SERVICE_URL` |
| `hr` | `http://localhost:4122` | `HR_TALENT_SERVICE_URL` |

Unknown service names return `404` ("Service not found in Zero-Trust registry").

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Gateway liveness (no auth) |
| `ALL` | `/api/route/:serviceName/*` | Authenticated proxy to a registered service |

## Verified end-to-end

`client → gateway (:4000, token verified) → company-service (:4120, token verified) → data`
returns the caller's companies with a real RS256 token; the same route without a token → `401`.

## Known gaps

- The `modules/*` folders (auth, corporate, files, …) are **README stubs**, not code — the
  gateway is a thin proxy, not a place for business logic (that lives in the services).
- Downstream service base URLs default to `localhost`; set the env vars above in deployment.

## Develop & test

```bash
pnpm --filter @nexus/api dev
pnpm --filter @nexus/api test   # gateway routing + rate-limiter specs
```

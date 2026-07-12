# NEXUS / Zad Social — Progress Tracker (Corrected & Verified)

This document tracks what is **actually implemented** in the repository, verified by reading
the source and running each service's typecheck (`tsc --noEmit`) and test suite. It replaces an
earlier version that listed aspirational scope as if delivered.

> **How to read this:** the PDF vision (`Zad Social Next generation…pdf`) describes 15 AI modules,
> a 7-layer architecture, mobile + web apps, and an AR/VR layer. That is the *target*, not the
> current state. This file distinguishes what exists in code from what is only a named folder.

---

## 📊 Reality Summary (as of this revision)

| Area | Planned | Has real code | Empty scaffold |
|---|---|---|---|
| Platform services | 32 | **17** | 15 |
| AI services | 17 | **2** (`ai-model-router`, `ai-orchestrator`) | 15 |
| Apps | 8 | **3** (backend gateways) | 5 |
| **Total services** | 49 | **19** | 30 |

**Two things to keep front-of-mind:**
- **The AI layer is early.** Of 17 AI services, only `ai-model-router` and the flagship
  `ai-orchestrator` (AI Life Orchestrator) have code. Every domain AI (health, education,
  emotion, digital-twin, memory, predictive-crisis, etc.) is still an empty directory.
- **There is no end-user frontend.** `apps/web` and `apps/mobile` are empty. Only backend
  gateways (`apps/api`, `apps/bff-gateway`, `apps/realtime-gateway`) contain code. The entire
  UX/UI design system in the PDF is not started.

### Status legend
- ✅ **Verified** — real logic; compiles and unit tests pass.
- 🟡 **Partial** — works but with a documented caveat or simulated leaf.
- 🧱 **Scaffold only** — directory/README exists, **no source code**.
- ❌ **Not started.**

---

## 🏗️ Local Infrastructure (Docker Compose)
*Defined in `infra/local/docker-compose.yml` — declared, not verified running in this audit.*

PostgreSQL · TimescaleDB · Neo4j · Redis · Kafka + Zookeeper · Milvus · MinIO · Flink · ClickHouse.
Note: all coded services hardcode **PostgreSQL on `localhost:5434`, DB `nexus_db`** and share it
(cross-service SQL queries assume this single shared database).

---

## 📦 Shared Packages (`packages/`)
- ✅ **`core-infra`** — real `PostgresModule` (TypeORM), plus `Redis` (ioredis), `Kafka`
  (@nestjs/microservices), `Neo4j` (neo4j-driver), and `MinIO` (@aws-sdk/client-s3, presigned URLs) modules. Used by the coded services.
- 🧱 Others (`api-contracts`, `config`, `constants`, `design-tokens`, `eslint-config`,
  `event-contracts`, `localization`, `permissions`, `sdk`, `shared-types`, `tsconfig`,
  `validators`) — present as workspace packages; treat as scaffolding unless a service imports them.

---

## 🚀 Platform Services (`services/platform-services/`)

### Core & Identity
- ✅ **`auth-service`** (28 files) — genuinely the richest service. Real bcrypt credentials,
  RS256 key management, refresh-token rotation, session listing/revocation, trusted-device log,
  new-device Kafka alert, lockout, TOTP MFA (otplib+qrcode), WebAuthn passkeys (@simplewebauthn),
  Google OAuth. Kafka consumer (`gdpr.user.deletion.requested`) is wired via hybrid `main.ts`.
  ⚠️ **No unit tests** — the most complex service is untested. Roles are a **JWT claim only**,
  not persisted to the DB.
- ✅ **`user-profile-service`** — TypeORM `UserProfile`/`UserPreferences`, ZeroTrust scope guard,
  dynamic age-grouping. **Fixed:** Kafka consumers (`auth.user.registered`, GDPR delete) are now
  wired (were dead); avatar integrity check now **fails closed** (was silently skipped on error).
- ✅ **`consent-service`** — TypeORM `ConsentRecord`, ZeroTrust guard, Kafka seeding on
  registration, Redis TTL cache, GDPR cascade. Correctly wired hybrid microservice.

### Privacy, Security & Compliance
- ✅ **`privacy-engine`** — real Laplace-noise differential privacy, PII anonymization, and
  **real file-I/O** cascade wipes across `./backups`, `./datalake`, `./models` checkpoint dirs.
  Kafka consumers correctly wired.
- 🟡 **`security-agent`** — real RS256 ZeroTrust guard + threat-score block; real Haversine
  impossible-travel math; real AES-256-GCM child-data crypto. **Fixed:** the child-data protection
  interceptor is now registered globally via `APP_INTERCEPTOR` (was dead code). ⚠️ Caveats:
  geo-coordinates are **hardcoded/hashed, not real GeoIP**; "ZKP" is symmetric AES-GCM (labeled a
  simulation in code, not an actual zero-knowledge proof).
- ✅ **`audit-observability-service`** — real WORM protection via **actual PL/pgSQL triggers**
  (`prevent_audit_logs_modifications`, `prevent_ai_decisions_modifications`) **and** a TypeORM
  `EntitySubscriber`; EU-AI-Act AI-decision explainability endpoint.
- ✅ **`audit-compliance-service`** — **Fixed extensively:** scanners no longer silently report
  `passed` on error (now `error`/`inconclusive`); GDPR-SLA and HIPAA-WORM scanners corrected to the
  **real columns/trigger names** and now actually detect; PCI-DSS PAN scan works; CCPA & SOC2
  honestly report **`inconclusive`** (the data they need — marketing-activity signal / persisted
  roles — isn't modelled). ROPA report now includes **live DB-derived metrics**. 10/10 tests pass.
- ✅ **`child-safety-service`** — `@MinAge()` + `AgeGateGuard`, heuristic grooming/cyberbullying
  scan with Kafka incident + parent alert. **Fixed:** age gate now **fails closed** (was fail-open);
  GDPR Kafka consumer now wired (was dead). ⚠️ COPPA consent flag is stored but not yet enforced;
  parent email is a placeholder.

### Data & Content
- 🟡 **`media-file-service`** — real EICAR malware stream scan, Jimp thumbnails, hand-rolled MP4
  atom parsing. **Fixed:** download path is now a **fail-closed allowlist** (only `clean` files
  served); a scan that errors is marked `scan_failed`, never faked as `clean`. **Added:** list-my-media
  (`GET /media`), delete (`DELETE /media/:id`, owner-checked, S3+thumbnail+DB), and a **GDPR
  right-to-erasure cascade** (`gdpr.user.deletion.requested` consumer, now wired in hybrid mode) —
  previously user media was never purged on account deletion.
- ✅ **`content-service`** — posts/comments/likes, feed generation (HTTP to social service),
  ZeroTrust guards. **Fixed:** GDPR Kafka consumer now wired (was dead); the broken `@Get('../feed')`
  route replaced with a dedicated `/feed` controller. **Added:** post/**article** type discriminator
  and author post-listing with pagination (`GET /posts/author/:id`).
- 🟡 **`messaging-service`** — real **AES-256-GCM** message encryption. **Fixed:** GDPR Kafka
  consumer wired; **"AI Twin Message Drafting" now genuinely calls `ai-model-router`** to generate
  drafts (resilient fallback to raw intent when the router is down; `aiGenerated` flag records
  which path ran). ⚠️ "threat-protection metadata" is still just `isLateNight` + `messageLength`.
- 🧱 **`search-service`**, **`media-service`** (duplicate of media-file), **`event-bus-service`** — no code.

### Communication & Social
- ✅ **`social-relationship-service`** — TypeORM `UserConnection`, real Neo4j `MERGE`/`DETACH DELETE`
  sync, real Cypher mutual-connections / friends-of-friends. **Fixed:** GDPR Kafka consumer wired.
- 🟡 **`notification-service`** — real template engine, channel routing, retry queue. **Fixed:**
  the `dispatch_notification` Kafka consumer (its **primary** entrypoint) is now wired; providers
  **transparently declare `simulated: true`** (no real SMTP/Twilio/FCM). **Added: Notification
  Intelligence** — category/priority classification, focus-mode gating (only critical family-safety/
  medical pass; the rest are held + released), and a Notification Health Score.
- ✅ **`family-service`** — **Family Hub backend** (new). Household management with guardian/parent/
  child/member roles + authority checks, milestones, a unified dashboard, and the **Family Harmony
  Engine** (elevated family stress, communication decline, milestone support → guardian alerts).
  RS256 guard, GDPR consumer. 12 tests; verified against real Postgres + Kafka.

### Business & Growth — Corporate MVP
- ✅ **`company-service`** (new, port 4120) — multi-tenant B2B companies (unique slug), membership
  with owner/admin/manager/member roles, and a nested department org chart. GDPR consumer. 5 tests.
- ✅ **`branding-marketing-service`** (new, port 4121) — brand kits + AI campaign engine; brand/
  campaign generation via `ai-model-router` (template fallback); fail-closed company-membership
  isolation. 6 tests.
- ✅ **`hr-talent-service`** (new, port 4122) — job postings + anonymised candidate pipeline with
  **bias-mitigated, explainable screening** (no identity fields; capability-only scoring with a
  per-competency breakdown). 7 tests.
- 🧱 Still scaffold-only: `analytics-service`, `billing-service`, `business-growth-service`,
  `marketplace-service`, `personal-finance-service`.

### Specialized Domains — 🧱 all scaffold only
`education-service`, `fitness-life-service`, `health-service`.

### Platform Operations — 🧱 all scaffold only
`feature-flag-service`, `integration-service`, `operations-command-service`, `realtime-service`.

---

## 🤖 AI Services (`services/ai-services/`)

- ✅ **`ai-model-router`** (Python / FastAPI, 12 files, **21 passing tests**) — the most complete
  and best-tested component in the repo. See dedicated section below.
- ✅ **`ai-orchestrator`** (Python / FastAPI, **16 passing tests**) — the AI Life Orchestrator.
  Real-time life-state model (6 probabilistic dimensions from signals), priority engine with
  stress-protected deferral, cross-domain conflict resolution, 3-horizon decision engine,
  router-backed daily briefing (template fallback), proactive action engine with an append-only
  log + 24h override, and a background 15-min inference loop. Reasons through `ai-model-router`.
  In-memory persistence today (swappable repository interface).
- 🧱 **The 15 other AI services have no code**, including the domain agents the orchestrator is
  built to coordinate: `ai-health`, `ai-education`, `ai-emotion`, `ai-digital-twin`, `ai-memory`,
  `ai-predictive-crisis`, `ai-collective-intelligence`, `ai-family-safety`, `ai-fitness-life`,
  `ai-finance-business-growth`, `ai-hr-talent`, `ai-marketing`, `ai-operations`,
  `ai-translator-cultural`, `ai-immersive-reality`.

### `ai-model-router` — detail
- ✅ 4-axis classifier (privacy → domain fine-tuned → latency → task/cost table).
- ✅ Multi-provider HTTP clients: OpenAI, Anthropic, Google Gemini, with automatic failover.
- ✅ Per-request cost accounting, load balancer with health tracking, multi-model chain pipelines,
  edge-model registry, EU-AI-Act audit logging (resilient) to `audit-observability-service`.
- ⚠️ With no provider API keys set, `call_llm` returns **simulated** responses; the "NEXUS
  domain fine-tuned models" (`nexus-health-ft`, etc.) are placeholders — those models don't exist.

---

## 🌐 Apps (`apps/`)
- ✅ **`api`** — real API gateway: reverse-proxy router (auth/media/notify/profile/family/content/
  messaging), working RS256 ZeroTrust guard, rate limiter, tests. Its `modules/*` are README stubs.
- 🟡 **`bff-gateway`** — aggregator + web/mobile controllers (some real code).
- 🟡 **`realtime-gateway`** — websocket gateway + stream manager (some real code).
- 🧱 **`web`, `mobile`, `admin`, `ar-vr-client`, `developer-portal`** — **empty. No frontend exists.**

---

## 🔧 Recent gap-closing fixes (this revision)

Applied top-down from the audit; each verified with `tsc` + tests:

1. **Kafka event backbone repaired.** 6 services had `@EventPattern` consumers that were never
   subscribed (`main.ts` never called `connectMicroservice`/`startAllMicroservices`), so GDPR
   cascades, profile seeding, and notification dispatch silently never fired. Now wired with unique
   consumer groups: `user-profile`, `child-safety`, `content`, `messaging`, `social-relationship`,
   `notification`. (Producer `.emit()` was already fine — NestJS 11 auto-connects.)
2. **audit-compliance no longer fabricates clean results.** Scans that error report `error`; scans
   that can't be evaluated report `inconclusive`; GDPR/HIPAA/PCI scanners corrected to real schema.
3. **security-agent child-data interceptor** registered globally (was dead code).
4. **media-file-service** download path made a fail-closed allowlist; scan errors → `scan_failed`.
5. **child-safety age gate** made fail-closed.
6. **messaging AI Twin drafting** wired to `ai-model-router` (real generation + resilient fallback).
7. **user-profile avatar** integrity check made fail-closed.
8. **notification providers** made transparently simulated (no more silent fake `success`).

### Later round — new features, docs, more fixes
9. **ai-orchestrator** built + full `DOCS.md` + `Dockerfile`.
10. **Notification Intelligence** (priority/focus filtering + health score) and **child-safety
    longitudinal wellbeing monitoring** added (PDF Modules).
11. **Accurate READMEs** written for all built services (replacing "no code" placeholders).
12. **Two real bugs fixed** found during the doc pass: `auth` session routes read `req.user.sub`
    (should be `userId`); `security-agent` `/security` endpoints were unguarded (now `ZeroTrustGuard`).
13. **Four new services built** (tests + real Postgres/Kafka verification): `family-service`,
    `company-service`, `branding-marketing-service`, `hr-talent-service`.

---

## ⚠️ Known limitations / not yet real
- **No frontend** (web/mobile/admin/AR-VR) and **no AI product** beyond the router.
- **Real external delivery not wired:** email/SMS/push (need SMTP/Twilio/FCM creds — currently
  transparently simulated); GeoIP for impossible-travel (currently hardcoded coordinates).
- **"ZKP"** is symmetric AES-256-GCM, not a zero-knowledge proof (labeled as simulation in code).
- **Thin test coverage:** unit tests mock the DB, so cross-service schema assumptions aren't
  integration-tested; `auth-service` has no tests.
- **CCPA/SOC2 compliance scans are inconclusive** until a marketing-activity signal and a persisted
  roles/RBAC model exist.
- Infra compose file is defined but running/health was not verified in this audit.

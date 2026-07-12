# HR & Talent Service

Corporate recruitment for the NEXUS / Zad Social platform (PDF Module 7 — AI HR, Talent
+ Employee Intelligence): job postings, an anonymised candidate pipeline, and
**bias-mitigated, explainable screening**.

- **Framework:** NestJS (TypeScript) · **Port:** `4122` · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `job_postings`, `candidates`
- **Auth:** `ZeroTrustGuard` (RS256) + per-request **company membership** check via `company-service`
- **Transport:** Kafka consumer (`gdpr.user.deletion.requested`) in hybrid mode

## Responsibility

- **Job postings** — create/list roles with weighted required competencies.
- **Candidate pipeline** — add candidates and move them through stages
  (sourced → screened → assessment → interview → offer → hired / rejected); Kanban view.
- **Bias-mitigated screening** — candidates are stored **without** name, photo, address,
  graduation year, or institution — only an anonymised reference code and a competency
  profile. Screening scores on demonstrated capability and returns an **explainable
  breakdown** (which competency contributed what).
- **Multi-tenant isolation** — every route verifies company membership (HTTP to
  `company-service`), **fail-closed**.
- **GDPR** — anonymises a deleted user's job authorship (candidates hold no user linkage).

## HTTP API

All routes require a Bearer token; the caller is `req.user.sub` and must be a company member.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/companies/:companyId/jobs` | Create a job. Body: `title, description?, requiredSkills? {skill: weight}` |
| `GET` | `/api/companies/:companyId/jobs` | List jobs |
| `POST` | `/api/jobs/:jobId/candidates` | Add a candidate. Body: `skills? {skill: level}, yearsExperience?, referenceCode?` |
| `GET` | `/api/jobs/:jobId/candidates/ranked` | Screen all + return ranked by match score |
| `GET` | `/api/jobs/:jobId/pipeline` | Kanban pipeline (candidates grouped by stage) |
| `POST` | `/api/candidates/:id/screen` | Score one candidate (explainable) |
| `PUT` | `/api/candidates/:id/stage` | Move stage. Body: `stage` |

## Screening model (explainable)

For each required skill: `contribution = weight × candidateLevel`. `skillScore` = weighted
mean of contributions; `matchScore = 0.85·skillScore + 0.15·experienceFactor`
(experience normalised, 10y = full). The stored `scoreBreakdown` lists every competency's
weight, the candidate's level, and its contribution — so a hiring manager can see, and
challenge, exactly what drove the ranking.

## Events (Kafka)

| Topic | Direction | Handler |
|---|---|---|
| `gdpr.user.deletion.requested` | consume | Anonymise the user's `createdBy` on job postings |

## Data model

- **JobPosting** — `id, companyId, title, description?, requiredSkills (jsonb {skill: weight}), status, createdBy, createdAt`
- **Candidate** — `id, jobId, companyId, referenceCode, skills (jsonb {skill: level}), yearsExperience, stage, matchScore?, scoreBreakdown?, createdAt, updatedAt` — **no identity fields by design**

## Data sensitivity

**Corporate confidential** — hiring data. Candidate identity proxies are deliberately not
stored; screening evaluates capability only. Access is gated by company membership.

## Environment

| Var | Default | Purpose |
|---|---|---|
| `COMPANY_SERVICE_URL` | `http://localhost:4120` | Membership verification |

## Develop & test

```bash
pnpm --filter @nexus/hr-talent-service dev
pnpm --filter @nexus/hr-talent-service test   # 7 tests
```

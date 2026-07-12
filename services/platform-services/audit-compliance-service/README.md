# Audit Compliance Service

Runs regulatory compliance scanners (GDPR / HIPAA / PCI-DSS / CCPA / SOC 2) against the live database and generates Article 30 ROPA legal exports.

- **Framework:** NestJS (TypeScript) · **Port:** `4108` · **Global prefix:** `/api` (`setGlobalPrefix('api')` is called in `main.ts`)
- **Persistence:** PostgreSQL (TypeORM) — `compliance_scans`, `compliance_reports` (scanners also read cross-service tables: `deletion_jobs`, `user_profiles`, `pg_trigger`, `users`, `consent_records`)
- **Auth:** `ComplianceRoleGuard` (RS256 JWT, requires `compliance` or `auditor` role), applied to the whole controller.

## Responsibility
- Execute named compliance scans and persist findings with an honest status taxonomy: `passed`, `failed`, `inconclusive`, `error`.
- Never report `passed` when a scan query throws — a broken scan yields `error`, and scans whose data is not modelled yield `inconclusive`.
- Generate a ROPA report whose narrative is a fixed legal template but whose quantitative metrics are queried live and defensively (missing table → `null`, not a fabricated number).

## HTTP API
Routes are declared on `@Controller('compliance')` under the `/api` global prefix.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/compliance/scan` | Run a scan by `scanType` (default `gdpr_sla_scan`). |
| GET | `/api/compliance/scans` | List all scans (newest first). |
| GET | `/api/compliance/scans/:id` | Fetch one scan. |
| POST | `/api/compliance/report` | Generate a report by `reportType`/`reportName` (default `ROPA`). |
| GET | `/api/compliance/reports` | List all reports (newest first). |
| GET | `/api/compliance/reports/:id` | Fetch one report. |

## Events (Kafka)
None.

## Data model
- **`compliance_scans`** — `id` (uuid PK), `scan_type`, `status` (`running`/`passed`/`failed`/`inconclusive`/`error`), `findings` (jsonb), `executed_at`.
- **`compliance_reports`** — `id` (uuid PK), `report_name`, `report_type` (ROPA/DSAR/EU_AI_ACT), `data_payload` (jsonb), `created_at`.

## Scanners (current state)
- `gdpr_sla_scan` — flags `deletion_jobs` unfinished past a 30-day SLA. **Works** against the real schema.
- `hipaa_scan` — verifies WORM triggers `prevent_audit_logs_modifications` / `prevent_ai_decisions_modifications` exist in `pg_trigger`. **Works**.
- `pci_dss_scan` — regex-scans `user_profiles.bio` for cleartext card PANs. **Works**.
- `ccpa_scan` — reports `inconclusive`: no marketing-activity signal is modelled to cross-reference against consent.
- `soc2_scan` — reports `inconclusive`: roles are a JWT claim only and are not persisted on the users table.
- unknown scan types — reported `inconclusive` with `UNKNOWN_SCAN_TYPE`.

## Data sensitivity
Regulated compliance data. Scans read across services (deletion jobs, profile bios, users, consent records) and findings may quote user identifiers, so scan output is sensitive/personal and access is gated by the compliance/auditor role.

## Known gaps
- CCPA and SOC 2 checks cannot be evaluated against the current schema and always return `inconclusive` (documented in code).
- Cross-service scans depend on other services' tables existing in the shared `nexus_db`; absent tables surface as `error`/`null` rather than crashing.
- DB connection settings are hardcoded in `app.module.ts` with `synchronize: true` (dev-only).

## Develop & test
```bash
pnpm --filter @nexus/audit-compliance-service dev
pnpm --filter @nexus/audit-compliance-service test
```

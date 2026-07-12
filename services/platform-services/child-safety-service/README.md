# Child Safety Service

Minor protection for the NEXUS / Zad Social platform (PDF Module 5 — Family Hub + Child
Safety): parental delegation, dynamic age-gating, safeguarding scans, and **longitudinal
emotional wellbeing monitoring**.

- **Framework:** NestJS (TypeScript) · **Port:** `4102` · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `parent_delegates`, `safety_incidents`, `wellbeing_snapshots`
- **Transport:** Kafka consumer (`gdpr.user.deletion.requested`) in hybrid mode; producer for incidents/alerts

## Responsibility

- **Parental delegation** — link a parent to a child; record COPPA consent.
- **Dynamic age-gating** — `@MinAge()` + `AgeGateGuard` verify a user's age (via user-profile)
  before restricted resources. **Fails closed** if age can't be verified.
- **Safeguarding scans** — heuristic detection of grooming / cyberbullying patterns in text;
  raises a `SafetyIncident`, emits `child.safety.incident`, and alerts the parent.
- **Emotional wellbeing monitoring** — records behavioural snapshots over time, detects sudden
  declines against the child's baseline, and (on concern) raises a gentle check-in for the child
  plus a contextual parent alert.

## HTTP API

All routes require a Bearer token (`ZeroTrustGuard`).

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/child-safety/delegate` | Register a parent→child delegate. Body: `childId` |
| `POST` | `/api/child-safety/coppa-consent` | Set COPPA consent. Body: `childId, coppaConsentGranted` |
| `GET` | `/api/child-safety/delegates` | List the caller's delegated children |
| `POST` | `/api/child-safety/scan` | Scan text. Body: `childId, text` → `{flagged, incident?}` |
| `GET` | `/api/child-safety/incidents/:childId` | Incidents (child / verified parent / admin only) |
| `POST` | `/api/child-safety/wellbeing/:childId` | Record a wellbeing snapshot (see signals below) |
| `GET` | `/api/child-safety/wellbeing/:childId` | Wellbeing trend (child / verified parent / admin only) |
| `GET` | `/api/child-safety/age-gated-resource` | Example `@MinAge(18)` route |

### Wellbeing signals (`POST /wellbeing/:childId`)

```json
{ "peerInteractions": 0-15, "lateNightMinutes": 0-120, "socialWithdrawal": 0.0-1.0, "contentPositivity": 0.0-1.0 }
```

Combined into a 0..1 `wellbeingScore` (higher = healthier). The first two snapshots build a
**baseline**; thereafter a **drop ≥ 0.2** vs baseline (or an absolute score < 0.3) is a
**concern** → a `wellbeing_concern` incident, a `child.wellbeing.checkin` event, and a parent
`dispatch_notification`. This supports, not surveils: the child gets a gentle check-in first.

## Events (Kafka)

| Topic | Direction | Purpose |
|---|---|---|
| `gdpr.user.deletion.requested` | consume | Purge delegates, incidents, wellbeing snapshots |
| `child.safety.incident` | emit | Safeguarding incident raised |
| `child.wellbeing.checkin` | emit | Gentle wellbeing check-in for the child |
| `dispatch_notification` | emit | Parent alert (via notification-service) |

## Data model

- **ParentDelegate** — `parentId, childId, coppaConsentGranted`
- **SafetyIncident** — `childId, incidentType (cyberbullying|grooming_risk|age_gate_violation|wellbeing_concern), severity, description, metadata`
- **WellbeingSnapshot** — `childId, peerInteractions, lateNightMinutes, socialWithdrawal, contentPositivity, wellbeingScore, createdAt`

## Data sensitivity

**Child** — the highest classification. Access to incidents and wellbeing is restricted to
the child, a verified parent delegate, or an admin.

## Known gaps

- Grooming/cyberbullying detection is heuristic (regex), not ML.
- COPPA consent is stored but not yet enforced at the gate.
- Parent email is a placeholder (`parent_xxxxxx@nexus.ai`) pending a real contact lookup.

## Develop & test

```bash
pnpm --filter @nexus/child-safety-service dev
pnpm --filter @nexus/child-safety-service test   # 6 tests
```

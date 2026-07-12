# Family Service

Family Hub backend for the NEXUS / Zad Social platform (PDF Module 5) — household
management, guardian permissions, milestones, a unified family dashboard, and the
**Family Harmony Engine**. Pairs with `child-safety-service` (which owns the safety
specifics: age-gating, safeguarding scans, per-child wellbeing).

- **Framework:** NestJS (TypeScript) · **Port:** `4101` · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `families`, `family_members`, `family_milestones`, `family_member_states`
- **Auth:** `ZeroTrustGuard` (RS256 JWT verified against `auth-service`'s public key)
- **Transport:** Kafka consumer (`gdpr.user.deletion.requested`) in hybrid mode; producer for harmony alerts

## Responsibility

- **Household management** — create a family; add/remove members with roles
  (`guardian`, `parent`, `child`, `member`). Guardians/parents hold management authority.
- **Milestones** — record family milestones (new sibling, house move, exam period …) that
  the harmony engine treats as coordinated-support triggers.
- **Family Hub dashboard** — a unified view of members and their latest wellbeing state plus
  the family harmony assessment.
- **Family Harmony Engine** — models the family as a whole: elevated family stress (multiple
  members stressed at once), declining parent-child communication, and milestone support;
  alerts guardians on concern.
- **GDPR** — removes a user from all families on account deletion.

## HTTP API

All routes require a Bearer token (`ZeroTrustGuard`). The acting user is `req.user.sub`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/families` | Create a family (creator becomes guardian). Body: `name` |
| `GET` | `/api/families` | Families the caller belongs to |
| `GET` | `/api/families/:id` | Get a family (members only) |
| `GET` | `/api/families/:id/members` | List members |
| `POST` | `/api/families/:id/members` | Add a member (guardian/parent). Body: `userId, role?, displayName?` |
| `DELETE` | `/api/families/:id/members/:userId` | Remove a member (guardian/parent, or self) |
| `GET` | `/api/families/:id/milestones` | List milestones |
| `POST` | `/api/families/:id/milestones` | Add a milestone (guardian/parent). Body: `type?, title, eventDate?` |
| `POST` | `/api/families/:id/state` | Report member wellbeing state. Body: `userId?, stress?, wellbeing?, communicationScore?` |
| `GET` | `/api/families/:id/harmony` | Assess family harmony |
| `POST` | `/api/families/:id/harmony/assess` | Assess **and** alert guardians on concern |
| `GET` | `/api/families/:id/dashboard` | Family Hub dashboard (members + state + harmony) |

## Family Harmony Engine

Member state (0..1 `stress`, `wellbeing`, `communicationScore`) is pushed per member — by
other services (the AI orchestrator's life-state, child-safety wellbeing) or reported directly.
`assess` returns a `harmonyScore` (0.4·wellbeing + 0.35·(1−stress) + 0.25·communication) and
`concerns`:

- **elevated_family_stress** — ≥2 of ≥2 members stressed (`stress ≥ 0.6`) at once.
- **communication_decline** — mean `communicationScore ≤ 0.35`.
- **milestone_support** — one per active milestone.

`assessAndAlert` emits a `dispatch_notification` to every guardian/parent and a
`family.harmony.alert` event when concerns exist. Only 0..1 summaries are stored — the engine
holds no raw personal data, keeping privacy boundaries intact.

## Events (Kafka)

| Topic | Direction | Purpose |
|---|---|---|
| `gdpr.user.deletion.requested` | consume | Remove the user from all families + their state |
| `dispatch_notification` | emit | Guardian alert (via notification-service) on harmony concern |
| `family.harmony.alert` | emit | Family-level harmony concern raised |

## Data model

- **Family** — `id, name, createdBy, createdAt`
- **FamilyMember** — `id, familyId, userId, role, displayName?, joinedAt` (unique per family+user)
- **FamilyMilestone** — `id, familyId, type, title, eventDate?, active, createdAt`
- **MemberState** — `id, familyId, userId, stress, wellbeing, communicationScore, updatedAt` (unique per family+user)

## Data sensitivity

**Child / sensitive** — households contain minors. Membership and dashboard access are
restricted to family members; management to guardians/parents. Harmony holds only aggregate
0..1 summaries, never raw signals.

## Develop & test

```bash
pnpm --filter @nexus/family-service dev
pnpm --filter @nexus/family-service test   # 12 tests (family CRUD + harmony engine)
```

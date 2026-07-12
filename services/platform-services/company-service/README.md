# Company Service

B2B organisation management for the NEXUS / Zad Social platform (Corporate MVP —
company profiles): multi-tenant companies, membership & roles, and the corporate
hierarchy (org chart). Foundation for the corporate services (branding-marketing,
hr-talent, operations).

- **Framework:** NestJS (TypeScript) · **Port:** `4120` · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `companies`, `company_members`, `departments`
- **Auth:** `ZeroTrustGuard` (RS256 JWT verified against `auth-service`'s public key)
- **Transport:** Kafka consumer (`gdpr.user.deletion.requested`) in hybrid mode

## Responsibility

- **Company profiles** — create/update a company (name, unique slug, industry, size,
  description, website).
- **Multi-tenant membership** — add/remove members with roles (`owner`, `admin`,
  `manager`, `member`); owners/admins hold management authority.
- **Corporate hierarchy** — departments form a nested org chart; members attach to a
  department. `GET /:id/hierarchy` returns the tree with members.
- **GDPR** — removes a user from all companies on account deletion.

## HTTP API

All routes require a Bearer token (`ZeroTrustGuard`); the acting user is `req.user.sub`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/companies` | Create a company (creator = owner). Body: `name, industry?, size?, description?, website?` |
| `GET` | `/api/companies` | Companies the caller belongs to |
| `GET` | `/api/companies/:id` | Get a company (members only) |
| `PUT` | `/api/companies/:id` | Update profile (owner/admin) |
| `GET` | `/api/companies/:id/members` | List members |
| `POST` | `/api/companies/:id/members` | Add a member (owner/admin). Body: `userId, role?, title?, departmentId?` |
| `DELETE` | `/api/companies/:id/members/:userId` | Remove a member (owner/admin, or self) |
| `GET` | `/api/companies/:id/departments` | List departments (flat) |
| `POST` | `/api/companies/:id/departments` | Add a department (owner/admin). Body: `name, parentDepartmentId?` |
| `GET` | `/api/companies/:id/hierarchy` | Nested org chart (departments + members) |

## Events (Kafka)

| Topic | Direction | Handler |
|---|---|---|
| `gdpr.user.deletion.requested` | consume | Remove the user from all companies |

## Data model

- **Company** — `id, name, slug (unique), industry?, size?, description?, website?, createdBy, createdAt, updatedAt`
- **CompanyMember** — `id, companyId, userId, role, title?, departmentId?, joinedAt` (unique per company+user)
- **Department** — `id, companyId, name, parentDepartmentId?, createdAt`

## Data sensitivity

**Corporate confidential** — org structure and membership. Access is restricted to
company members; management to owners/admins. Multi-tenant isolation is enforced by
membership checks on every company-scoped route.

## Develop & test

```bash
pnpm --filter @nexus/company-service dev
pnpm --filter @nexus/company-service test   # 5 tests
```

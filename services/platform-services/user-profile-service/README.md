# User Profile Service

Owns user profile and preference records, seeded from auth events and guarded by zero-trust JWT verification.

- **Framework:** NestJS (TypeScript) · **Port:** `4103` · **Global prefix:** `/api` (hybrid HTTP + Kafka microservice)
- **Persistence:** PostgreSQL (TypeORM) — tables `user_profiles`, `user_preferences`
- **Auth:** `ZeroTrustGuard` — verifies RS256 JWTs against the auth-service public key (fetched from `${AUTH_SERVICE_URL}/api/auth/public-key`, cached 24h) and populates `req.user = { sub, email, roles }`.

## Responsibility
- Stores and serves per-user profile data (name, bio, avatar, birth date, derived age group) and preferences (theme, language, notifications, accessibility).
- Auto-seeds a default profile and preferences when it consumes `auth.user.registered`; cascades deletes on `gdpr.user.deletion.requested`.
- Derives an `ageGroup` (`child` < 13, `teen` 13–17, `adult` 18+) from birth date to support downstream age-gating.
- Verifies avatar media before linking it: queries `media_records` for ownership + `clean` scan status and **fails closed** if the check cannot run.
- Emits `profile.updated` on every profile/preference/avatar change.

## HTTP API
| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/profile/me` | Current user's profile |
| GET | `/api/profile/preferences/me` | Current user's preferences |
| GET | `/api/profile/:userId` | Profile by id (self or `admin` only) |
| POST | `/api/profile` | Create/update own profile |
| PUT | `/api/profile/preferences` | Update own preferences |
| PATCH | `/api/profile/avatar` | Set avatar after media integrity check |

All routes are protected by `ZeroTrustGuard`.

## Events (Kafka)
Broker `KAFKA_BROKER` (default `localhost:9092`); consumer group `user-profile-service-group`.

| Topic | Direction | Handler |
| --- | --- | --- |
| `auth.user.registered` | consume | `ProfileController` → `seedDefaultProfile` |
| `gdpr.user.deletion.requested` | consume | `ProfileController` → `deleteProfile` |
| `profile.updated` | emit | on profile / preference / avatar change |

## Data model
- **user_profiles** — `id` (uuid), `user_id` (unique), `first_name`, `last_name`, `bio` (text), `avatar_media_id`, `birth_date`, `age_group` (`child`|`teen`|`adult`, default `adult`), `created_at`, `updated_at`.
- **user_preferences** — `id` (uuid), `user_id` (unique), `theme` (`light`|`dark`, default `dark`), `language` (default `en`), `notifications_enabled` (default `true`), `accessibility_mode` (default `false`), `updated_at`.

## Data sensitivity
Personal data, including names, bio, and birth date. The derived `age_group` can flag minors (`child`/`teen`), bringing child-data and age-gating obligations into scope. Avatar linkage is gated on a malware-scan (`clean`) status to avoid serving unverified media.

## Known gaps
- Database config is **hardcoded** (`localhost:5434`, `nexus/password/nexus_db`) with no env fallback; Kafka broker is likewise hardcoded to `localhost:9092`.
- `synchronize: true` on TypeORM — dev-only schema auto-sync.
- `updateAvatar` runs raw SQL against another service's `media_records` table on the shared datasource — cross-service table coupling rather than an API/event boundary.
- Thin test coverage: a single `profile.service.spec.ts` (3 cases); controllers, guard, and Kafka handlers are untested.
- `AUTH_SERVICE_URL` defaults to `http://localhost:4100`.

## Develop & test
```bash
pnpm --filter @nexus/user-profile-service dev
pnpm --filter @nexus/user-profile-service test
```

# Auth Service

Central identity provider for the NEXUS platform: registration, password login, refresh-token sessions, MFA, WebAuthn passkeys, Google OAuth, and RS256 key management for the whole ecosystem.

- **Framework:** NestJS (TypeScript) · **Port:** `4100` (hybrid HTTP + Kafka microservice)
- **Persistence:** PostgreSQL (TypeORM) — tables `users`, `refresh_tokens`, `user_devices`, `mfa_configs`, `passkeys`, `oauth_profiles`
- **Auth:** RS256 JWT. `KeysService` loads/generates an RSA-2048 keypair under `./secrets`; protected routes use `JwtAuthGuard` (passport-jwt). `ThrottlerGuard` (10 req / 60s) is applied globally. Redis backs WebAuthn challenges.

## Responsibility
- Issues RS256 access tokens (1h) plus rotating opaque refresh tokens (7d); publishes the signing key via JWKS and a raw public-key endpoint that other services fetch for zero-trust verification.
- Password auth with bcrypt (cost 12), failed-attempt lockout (5 tries → 15 min), and email-verification tokens.
- Second factors: TOTP MFA (otplib + QR, recovery codes) and WebAuthn passkeys (@simplewebauthn). Google OAuth2 sign-in via passport.
- Session and device management (list/revoke sessions, trust devices) and a GDPR delete handler that removes the user and emits `auth.user.deleted`.

## HTTP API
| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/auth/health` | Liveness string |
| POST | `/api/auth/register` | Register user; returns email-verification token |
| GET | `/api/auth/verify-email` | Verify email via `?token=` |
| POST | `/api/auth/login` | Password login; may return `mfaRequired` |
| POST | `/api/auth/refresh` | Rotate refresh token, issue new pair |
| POST | `/api/auth/logout` | Revoke a refresh token |
| GET | `/api/auth/sessions` | List active sessions (JWT) |
| DELETE | `/api/auth/sessions/:id` | Revoke one session (JWT) |
| DELETE | `/api/auth/sessions/other` | Revoke all other sessions (JWT) |
| GET | `/api/auth/devices` | List trusted devices (JWT) |
| PUT | `/api/auth/devices/:id/trust` | Toggle device trust (JWT) |
| GET | `/api/auth/status` | Validate bearer token, return payload |
| GET | `/api/auth/.well-known/jwks.json` | JWKS for the signing key |
| GET | `/api/auth/public-key` | Raw PEM public key |
| POST | `/mfa/generate` | Generate TOTP secret + QR (JWT) |
| POST | `/mfa/verify` | Confirm TOTP and enable MFA (JWT) |
| POST | `/mfa/login` | Complete MFA step of login |
| GET | `/passkey/register/generate` | WebAuthn registration options (JWT) |
| POST | `/passkey/register/verify` | Verify + store passkey (JWT) |
| GET | `/passkey/auth/generate` | WebAuthn auth options via `?email=` |
| POST | `/passkey/auth/verify` | Verify passkey, issue tokens |
| GET | `/oauth/google` | Start Google OAuth2 flow |
| GET | `/oauth/google/callback` | OAuth callback, issue tokens |

Note: only `AppController` is mounted under `/api/auth`; the MFA, passkey, and OAuth controllers are **not** under `/api` (no `setGlobalPrefix`).

## Events (Kafka)
Broker `KAFKA_BROKER` (default `localhost:9092`); consumer group `auth-service-group`.

| Topic | Direction | Handler / Source |
| --- | --- | --- |
| `gdpr.user.deletion.requested` | consume | `AuthKafkaController` → `deleteUserAndNotify` |
| `auth.user.registered` | emit | on `register` |
| `auth.user.logged_in` | emit | on password/MFA login |
| `auth.user.deleted` | emit | after GDPR delete |
| `dispatch_notification` | emit | welcome email + new-device-login alert |

## Data model
- **users** — `id` (uuid), `email` (unique), `passwordHash` (nullable, `select:false`), `failedLoginAttempts`, `lockoutUntil`, `emailVerified`, `verificationToken`/`verificationTokenExpiresAt` (`select:false`), `archetype` (`personal`|`family`|`corporate`), timestamps; relations to MFA config, passkeys, OAuth profiles, refresh tokens.
- **refresh_tokens** — `id`, `token`, `expiresAt`, `isRevoked`, `deviceFingerprint`, `ipAddress`, timestamps, `user` (FK, cascade delete).
- **user_devices** — `id`, `user_id`, `device_fingerprint`, `device_name`, `is_trusted`, `last_login_at`, `last_ip_address`, `user` (FK).
- **mfa_configs** — `id`, `isEnabled`, `secret`, `recoveryCodes` (simple-array), timestamps, one-to-one `user`.
- **passkeys** — `id`, `credentialId`, `publicKey`, `counter`, `transports` (simple-array), timestamps, `user` (FK).
- **oauth_profiles** — `id`, `provider`, `providerId` (unique per provider), timestamps, `user` (FK).

## Data sensitivity
Sensitive/personal: stores authentication secrets (bcrypt password hashes, TOTP secrets, MFA recovery codes, passkey public keys) plus emails, IP addresses, and device fingerprints. The RSA private key in `./secrets` is the platform's root of trust. Compromise enables account takeover across every downstream service.

## Known gaps
- **No unit tests.** The service has no `*.spec.ts` and no `test` script — only two scratch scripts (`test-otplib.js`, `test-otplib2.js`) at the service root.
- `synchronize: true` on TypeORM (schema auto-sync) — dev/MVP only, unsafe for production.
- `JwtStrategy.validate` returns `{ userId }`, but `AppController` session/device routes read `req.user.sub` (undefined), while the MFA/passkey controllers read `req.user.userId`. The session/device endpoints are effectively broken until reconciled.
- Registration returns the raw `verificationToken` in the HTTP response instead of emailing it.
- Hardcoded `http://localhost:4109/telemetry/audit` (audit) and `http://localhost:4104/consent/update` (consent bootstrap) service URLs.
- Google OAuth falls back to `dummy-client-id`/`dummy-client-secret`; passkey `rpID`/origin are hardcoded to `localhost:3000`.
- RSA keys are generated/stored on local disk with no rotation or KMS integration.

## Develop & test
```bash
pnpm --filter @nexus/auth-service dev
pnpm --filter @nexus/auth-service test   # no test script defined yet
```

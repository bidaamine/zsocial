# Notification Service

Alert dispatching + **Notification Intelligence** for the NEXUS / Zad Social platform:
template rendering, channel routing, resilient retries, and priority/focus-aware filtering.

- **Framework:** NestJS (TypeScript) · **Port:** `4105` · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `notifications`, `notification_preferences`
- **Transport:** Kafka consumer (`dispatch_notification`) in hybrid mode

## Responsibility

Compose notifications from templates, route to email/SMS/push, retry failures, and apply
**Notification Intelligence** — classify each notification's category & urgency and, during a
user's focus block, deliver only critical (family-safety / medical) items while holding the
rest. Exposes a per-user Notification Health Score.

## HTTP API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/notifications/send` | Manual dispatch. Body: `userId, channel, templateKey, recipient, variables, category?, priority?` |
| `GET` | `/api/notifications/history/:userId` | Delivery history |
| `POST` | `/api/notifications/retry-failed` | Re-attempt queued/failed notifications |
| `POST` | `/api/notifications/focus-mode` | Set focus mode. Body: `{userId, enabled}` |
| `POST` | `/api/notifications/focus-mode/:userId/release` | Deliver everything held during focus |
| `GET` | `/api/notifications/health-score/:userId` | Today's sent / held / filtered ratio |

## Events (Kafka)

| Topic | Direction | Handler |
|---|---|---|
| `dispatch_notification` | consume | Compose + intelligently dispatch a notification |

Payload: `{ userId, channel, templateKey, recipient, variables?, category?, priority? }`.

## Notification Intelligence

- **Categories:** `ai_action`, `alert`, `insight`, `info`. **Priorities:** `critical`, `high`, `normal`, `low`.
- Templates are auto-classified (`child_safety_alert` → alert/**critical**, `mfa_code` → alert/high,
  `welcome` → info/low, …); callers may override `category`/`priority`.
- **Focus mode:** when on, only `critical` notifications are delivered; the rest are marked
  `held`. `release` delivers held items when focus ends.
- **Health Score:** `{ total, sent, held, failed, filteredRatio, focusMode, reasons }` for today.

## Delivery channels

Email / SMS / push are routed to their providers. **No real transport (SMTP/Twilio/FCM) is
wired yet** — providers currently return `simulated: true` and the notification records a
`simulated` flag, so history never claims a real send that didn't happen. Retries use
`retryCount` (max 3 → `failed`).

## Data model

- **Notification** — `id, userId, channel, recipient, category, priority, title, body, status
  (queued|sent|failed|held), retryCount, simulated, errorMessage?, createdAt, sentAt?`
- **NotificationPreference** — `userId, focusMode, updatedAt`

## Data sensitivity

**Personal** — notification content and delivery metadata. Child-safety notifications carry
the child classification.

## Develop & test

```bash
pnpm --filter @nexus/notification-service dev
pnpm --filter @nexus/notification-service test   # 5 tests
```

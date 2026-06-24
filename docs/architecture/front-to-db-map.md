# Frontend to Database Map

```text
Next.js / Flutter / Admin
        ↓
NestJS API Gateway
        ↓
Auth + Permission + Consent
        ↓
Product Domain Module
        ↓
Platform Service or Python AI Service
        ↓
Database / Event Bus / Cache / Object Storage
        ↓
Audit + Notification + Analytics
        ↓
Response to Client
```

## Database ownership

- User, account, billing, permissions → PostgreSQL.
- Social/family/company/professional relationships → Graph DB.
- Wearables, health, activity, emotion, finance trends → Time-series DB.
- AI memory and semantic retrieval → Vector DB.
- Session/cache/realtime → Redis.
- Documents/media/assets → Object storage.
- Aggregate analytics → Warehouse.

## Rule

Frontend never talks directly to databases or AI services. All requests pass through NestJS API for authentication, permission checks, consent checks, and auditability.

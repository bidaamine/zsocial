# Media File Service

Raw file management for the NEXUS / Zad Social platform: secure uploads, malware
scanning, image/video processing, owner-scoped downloads, and GDPR erasure.

- **Framework:** NestJS (TypeScript) · **Port:** `4107` · **Global prefix:** `/api`
- **Object storage:** MinIO / S3-compatible (`@aws-sdk/client-s3`), bucket `nexus-media`
- **Metadata:** PostgreSQL (TypeORM) — `media_records`
- **Auth:** `MediaAccessGuard` (RS256 JWT verified against `auth-service`'s public key)

## Responsibility

Presigned upload/download URLs, owner-isolated storage, asynchronous malware
scanning, image thumbnailing, video metadata extraction, file lifecycle
(list/delete), and right-to-erasure of a user's media.

## Upload → scan → download lifecycle

1. **`POST /api/media/upload-url`** — creates a `media_records` row (`pending_upload`) and
   returns a presigned PUT URL under `uploads/{userId}/{fileId}-{filename}`.
2. Client uploads the bytes directly to MinIO/S3 using that URL.
3. **`POST /api/media/process-upload/:fileId`** — downloads the object and scans it:
   - **EICAR** malware signature → object deleted, status `quarantined`.
   - Clean → status `clean`; images get a 150×150 thumbnail (Jimp); MP4s get real
     duration parsed from `moov/mvhd` atoms; metadata stored as JSON.
   - **Scan could not run** (S3 error) → status `scan_failed` (**never** faked as clean).
4. **`GET /api/media/download-url/:fileId`** — returns a presigned GET URL **only if the
   file is `clean`** and owned by the caller (fail-closed allowlist).

## HTTP API

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/media/upload-url` | ✅ | Reserve a file + presigned upload URL. Body: `filename` |
| `POST` | `/api/media/process-upload/:fileId` | — | Trigger scan/processing after upload |
| `GET` | `/api/media/download-url/:fileId` | ✅ (owner) | Presigned download URL — clean files only |
| `GET` | `/api/media` | ✅ | List the caller's media (newest first) |
| `DELETE` | `/api/media/:fileId` | ✅ (owner) | Delete file: S3 object + thumbnail + DB record |

## Events (Kafka)

Runs in hybrid mode (`connectMicroservice` + `startAllMicroservices`).

| Topic | Direction | Handler |
|---|---|---|
| `gdpr.user.deletion.requested` | consume | Purge **all** of a user's media (S3 objects, thumbnails, DB rows) |

## Data model

**MediaRecord** (`media_records`): `id`, `ownerId`, `filename`, `s3Key`, `mimeType`,
`size`, `status`, `thumbnailS3Key?`, `metadata?` (JSON string), `createdAt`.

`status` ∈ `pending_upload` · `scanning` · `clean` · `quarantined` · `scan_failed`.

## Security notes

- Objects are stored under **owner-isolated** keys (`uploads/{userId}/…`).
- Downloads are **fail-closed**: anything not confirmed `clean` (unscanned, scanning,
  scan_failed, quarantined) is refused.
- A scan that cannot complete marks the file `scan_failed`; it is never served.

## Data sensitivity

**Personal** by default; individual assets may be **sensitive**, **child**, or
**health** depending on content and must inherit the uploader's classification.

## Environment

| Var | Default | Purpose |
|---|---|---|
| `KAFKA_BROKER` | `localhost:9092` | Kafka broker for the GDPR consumer |

MinIO endpoint/credentials and the `nexus-media` bucket are configured in
`app.module.ts` (dev defaults: `http://localhost:9000`, `nexus`/`password123`).

## Develop & test

```bash
pnpm --filter @nexus/media-file-service dev    # nest start --watch
pnpm --filter @nexus/media-file-service test   # jest
```

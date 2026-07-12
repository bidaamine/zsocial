# Content Service

Social content management for the NEXUS / Zad Social platform: posts, long-form
articles, comments, likes, and the personalised feed.

- **Framework:** NestJS (TypeScript) · **Port:** `4112` · **Global prefix:** `/api`
- **Persistence:** PostgreSQL (TypeORM) — `posts`, `comments`, `likes`
- **Auth:** `ZeroTrustGuard` (RS256 JWT verified against `auth-service`'s public key, cached 24h)

## Responsibility

Posts and **article** management, comments and likes, personalised feed generation,
and GDPR erasure of a user's content. Moderation state and AI ranking are out of
scope here (handled by `child-safety-service` / future AI services).

## HTTP API

All write routes require a Bearer token; the author is taken from the token (`sub`).

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/posts` | ✅ | Create a post or article. Body: `title`, `content`, `tags?[]`, `type?` (`post`\|`article`, default `post`) |
| `GET` | `/api/posts/:id` | — | Get a single post/article |
| `GET` | `/api/posts/author/:authorId` | — | List an author's content, newest first. Query: `limit`, `offset`, `type?` |
| `PUT` | `/api/posts/:id` | ✅ (owner) | Update `title`/`content`/`tags` |
| `DELETE` | `/api/posts/:id` | ✅ (owner) | Delete a post and cascade its comments/likes |
| `POST` | `/api/posts/:id/comments` | ✅ | Add a comment. Body: `content` |
| `GET` | `/api/posts/:id/comments` | — | List a post's comments |
| `DELETE` | `/api/posts/comments/:commentId` | ✅ (owner) | Delete a comment |
| `POST` | `/api/posts/:id/like` | ✅ | Toggle like → `{ liked: boolean }` |
| `GET` | `/api/feed` | ✅ | Personalised feed. Query: `limit`, `offset` |

### Feed behaviour
`GET /api/feed` fetches the caller's connections from `social-relationship-service`
(`SOCIAL_SERVICE_URL`, default `http://localhost:4106`). If the user follows anyone,
the feed is their posts + the user's own, newest first; otherwise it falls back to a
global newest-first feed. Both paths are paginated (`limit`/`offset`).

## Events (Kafka)

Runs in hybrid mode (`connectMicroservice` + `startAllMicroservices`).

| Topic | Direction | Handler |
|---|---|---|
| `gdpr.user.deletion.requested` | consume | Purge all posts, comments, and likes for the user (right-to-erasure) |

## Data model

- **Post** — `id`, `authorId`, `title`, `type` (`post`\|`article`), `content`, `tags` (JSON string), `createdAt`, `updatedAt`
- **Comment** — `id`, `postId`, `authorId`, `content`, `createdAt`
- **Like** — `id`, `postId`, `userId`

## Data sensitivity

**Personal** — user-generated content. Content authored by minors falls under the
child-safety classification and must be routed through `child-safety-service` checks
before display.

## Environment

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `4112` | HTTP port |
| `SOCIAL_SERVICE_URL` | `http://localhost:4106` | social-relationship-service (feed connections) |
| `KAFKA_BROKER` | `localhost:9092` | Kafka broker for the GDPR consumer |

## Develop & test

```bash
pnpm --filter @nexus/content-service dev    # nest start --watch
pnpm --filter @nexus/content-service test   # jest
```

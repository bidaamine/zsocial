# Applications Layer

This folder contains the user-facing applications and the Edge Gateways for the NEXUS Architecture.

## Folder Structure and Responsibilities

- **`admin`**: Owns internal operations, support, moderation, compliance review, and system observability screens.
- **`api`**: The primary Edge API Gateway. Enforces Zero-Trust security (JWT, RBAC) and dynamically routes requests to downstream microservices.
- **`ar-vr-client`**: Client applications tailored for Augmented Reality (AR) and Virtual Reality (VR) platforms.
- **`bff-gateway`**: Backend-for-Frontend (BFF) Gateway. Orchestrates parallel calls to microservices and aggregates data into optimized payloads for web and mobile clients.
- **`developer-portal`**: External portal providing API documentation, SDKs, and integration guides for third-party developers.
- **`mobile`**: The Flutter iOS/Android application experience.
- **`realtime-gateway`**: WebSocket gateway managing real-time pub/sub streams, live updates, and online presence.
- **`web`**: The Next.js web experience for personal, creator, and corporate users.

*(Note: These apps should not contain deep AI logic. AI-heavy reasoning belongs in dedicated Python services).*

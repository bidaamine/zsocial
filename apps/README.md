# Applications Layer


> This folder is intentionally documentation-only for now. It defines ownership, responsibilities, data flow, and future implementation boundaries. No application code is included in this generated structure.



This folder contains the user-facing applications and the main NestJS API gateway.

Application responsibilities:

- `api` owns the primary backend entry point, product APIs, permission checks, and orchestration calls.
- `web` owns the Next.js web experience for personal and corporate users.
- `mobile` owns the Flutter iOS/Android experience.
- `admin` owns internal operations, support, moderation, compliance review, and system observability screens.

These apps should not contain deep AI logic. AI-heavy reasoning belongs in Python services under `services/ai-services`.

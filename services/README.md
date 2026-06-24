# Services Layer


> This folder is intentionally documentation-only for now. It defines ownership, responsibilities, data flow, and future implementation boundaries. No application code is included in this generated structure.



This folder contains independently deployable backend services that support the NEXUS platform.

It is split into:

- `ai-services` — Python services for AI orchestration, domain agents, model routing, memory, predictions, and intelligence.
- `platform-services` — non-AI operational services such as notifications, realtime, billing, media, search, analytics, integrations, and event bus helpers.

The service layer allows the platform to scale team ownership and runtime resources independently.

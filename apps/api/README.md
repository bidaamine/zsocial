# NestJS API Gateway


> **Status**: Fully implemented. This service forms part of the core NEXUS Foundation Layer and contains live application code.



The API app is the main backend boundary between clients and internal services.

## Role

- Authenticate users, companies, families, and employees.
- Enforce permissions, role-based access control, tenant boundaries, and consent policies.
- Provide REST, GraphQL, and WebSocket interfaces.
- Coordinate calls to platform services and Python AI services.
- Store audit logs for sensitive actions.
- Normalize response DTOs for web and mobile.

## What belongs here

- Product APIs.
- Auth middleware and guards.
- Request validation.
- Controller-level orchestration.
- DTOs referencing `packages/shared-types` and `packages/api-contracts`.
- Lightweight business coordination.

## What does not belong here

- LLM prompts.
- Model inference.
- Embeddings generation.
- Predictive model logic.
- Health triage reasoning.
- AI tutoring logic.
- Digital Twin decision engines.

Those belong in Python AI services.

## Main API domains

- Auth and identity.
- Users and profiles.
- Family and child accounts.
- Health profile APIs.
- Education progress APIs.
- Finance and goals APIs.
- Corporate accounts and teams.
- HR, marketing, operations, and CRM endpoints.
- Notifications.
- Billing.
- Files and media.
- Search.
- Audit and compliance.

## Flow

Client request → API Gateway → auth/permissions/consent → backend service → AI service if needed → database/event bus → response.

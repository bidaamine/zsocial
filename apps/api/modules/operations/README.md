# NestJS Module: operations


> This folder is intentionally documentation-only for now. It defines ownership, responsibilities, data flow, and future implementation boundaries. No application code is included in this generated structure.



## Responsibility

Command centre APIs, project health summaries, workforce analytics, process automation, CRM intelligence, and reporting endpoints.

## Integration

This module should expose product-safe APIs to the frontend and call internal services when needed. If AI reasoning is required, it should route through `apps/api/modules/ai-proxy`, not call model providers directly.

## Data

Operational data should be stored in the database owned by the correct domain. Sensitive domains such as health, children, finance, and emotional state must always pass through consent and audit checks.

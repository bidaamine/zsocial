# NestJS Module: marketing


> This folder is intentionally documentation-only for now. It defines ownership, responsibilities, data flow, and future implementation boundaries. No application code is included in this generated structure.



## Responsibility

Brand builder APIs, campaign briefs, campaign performance summaries, audience intelligence requests, and competitor radar results.

## Integration

This module should expose product-safe APIs to the frontend and call internal services when needed. If AI reasoning is required, it should route through `apps/api/modules/ai-proxy`, not call model providers directly.

## Data

Operational data should be stored in the database owned by the correct domain. Sensitive domains such as health, children, finance, and emotional state must always pass through consent and audit checks.

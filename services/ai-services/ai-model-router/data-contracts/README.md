# AI Model Router — Data Contracts

## Purpose

Defines the API contracts and inter-service telemetry schemas for the AI Model Router.

## Implemented Contracts

### Internal API Contracts (Pydantic — `src/models.py`)
- `RouterRequest` — inbound routing request with task type, domain hint, latency, privacy, and cost constraints.
- `RouterResponse` — outbound response including model selection, response text, tokens, cost, and explainability.
- `ChainRouteRequest` — inbound request to execute a sequence of models (defined chain or custom steps).
- `ChainRouteResponse` — outbound response detailing execution stats and outcomes for each step in a chain.
- `LoadBalancerStatsResponse` — admin stats showing health and metrics for all load balancer pools.

### Audit Telemetry Contract (`src/metrics.py`)
- `dispatch_compliance_audit_log` — async POST to audit-observability-service `/telemetry/ai-decision` for EU AI Act compliance.

## Future Contracts
- `ai.route.completed` Kafka event schema for downstream analytics.
- `ai.route.failed` Kafka event schema for monitoring alerts.
- `ai.model.cost.report` daily aggregation event for billing-service.

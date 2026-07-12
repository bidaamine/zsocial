# AI Model Router — Evaluations

## Purpose

Quality benchmarks and evaluation datasets for validating routing accuracy, model quality, and cost efficiency.

## Current Evaluation

### Unit and Integration Test Suite (`tests/test_router.py`)

The suite contains **21 automated tests** covering:

1. **Liveness Verification** — `/health` endpoint check.
2. **Sovereign Privacy Routing** — `strict_sovereign` forces local model regardless of domain hints, task constraints, or cost envelopes.
3. **Task & Cost Rules** — verifies mapping rules (e.g. `reasoning` + `high_performance` → `gpt-4o`).
4. **Realtime Latency Routing** — `realtime` priority selects low-latency models (`gpt-4o-mini`).
5. **Failover Mechanism** — verifies automatic retry using fallback provider on primary API exception.
6. **Domain Fine-Tuned Routing** — verifies correct matching for health, education, finance, and emotion domain targets.
7. **Edge Model Registry** — tests retrieval of the distilled edge models array via `/edge-models`.
8. **Configurable Routing Table** — verifies loading and hot-reloading a custom routing table file.
9. **Load Balancer Weighted selection** — verifies correct round-robin order based on instance weights.
10. **Circuit Breaker** — checks that instances are dynamically quarantined after 3 consecutive failures and restored upon success.
11. **Chain Routing** — tests template-based (`retrieval_then_reasoning`) and custom multi-step pipeline execution.

## Future Evaluations
- Routing accuracy benchmark: golden dataset of 500 classified prompts with expected model selections.
- Latency distribution analysis across providers.
- Cost efficiency comparison: simulated vs real provider billing.
- Model quality A/B tests: compare response quality across providers for identical prompts.

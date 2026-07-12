# AI Model Router — Schemas

## Purpose

Documents the Pydantic schemas used by the AI Model Router service for input validation and API contracts.

## Implemented Schemas (`src/models.py`)

### `RouterRequest`
| Field | Type | Default | Description |
|---|---|---|---|
| `prompt` | `str` | required | Prompt text to send to the routed model |
| `task_type` | `TaskType` | `"generation"` | Task classification: reasoning, generation, retrieval, classification, prediction, multimodal, voice, vision |
| `latency_priority` | `LatencyPriority` | `"balanced"` | Latency requirement: realtime, balanced, background |
| `privacy_sensitivity` | `PrivacySensitivity` | `"public"` | Privacy level: public, sensitive, strict_sovereign |
| `cost_envelope` | `CostEnvelope` | `"balanced"` | Cost/performance tradeoff: low_cost, balanced, high_performance |
| `domain` | `DomainHint` | `"general"` | Domain hint for fine-tuned routing: health, education, finance, emotion, general |
| `user_id` | `str | None` | `None` | User identifier for audit and tracing |

### `RouterResponse`
| Field | Type | Description |
|---|---|---|
| `routed_model` | `str` | Name of the selected model |
| `provider` | `str` | Provider name (openai, anthropic, google, local, nexus) |
| `response_text` | `str` | Text response from the model |
| `latency_ms` | `float` | Request latency in milliseconds |
| `tokens_used` | `TokensUsed` | Token consumption breakdown |
| `cost_usd` | `float` | Estimated cost in USD |
| `explainability_summary` | `str` | Human-readable justification of routing decision |
| `fallback_triggered` | `bool` | Whether the fallback provider was used |

### `ChainRouteRequest`
| Field | Type | Default | Description |
|---|---|---|---|
| `prompt` | `str` | required | Original prompt to feed into the chain |
| `chain_name` | `str` | required | Pre-defined template name or `"custom"` |
| `custom_steps` | `List[ChainStepInput] | None` | `None` | Custom steps to execute (only when chain_name='custom') |
| `user_id` | `str | None` | `None` | User identifier for audit trail |

### `ChainRouteResponse`
| Field | Type | Description |
|---|---|---|
| `chain_name` | `str` | Name of the executed chain |
| `final_output` | `str` | Final text outcome from the last step in the chain |
| `steps_completed` | `int` | Number of steps successfully executed |
| `total_latency_ms` | `float` | Cumulative latency of all steps |
| `total_tokens` | `Dict` | Aggregated prompt, completion, and total tokens |
| `total_cost_usd` | `float` | Aggregated cost in USD |
| `step_details` | `List[ChainStepDetail]` | Individual latency, tokens, cost, and output preview per step |

### `LoadBalancerStatsResponse`
| Field | Type | Description |
|---|---|---|
| `pools` | `List[PoolStats]` | Metrics per provider pool (healthy instances, total requests, total failures) |

## Service Context

All schemas align with the NEXUS principles of privacy, transparency, user sovereignty, and no advertising-driven optimization.

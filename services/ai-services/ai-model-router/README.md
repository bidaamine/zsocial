# AI Model Router

> **Service**: `nexus_llm_router_service`
> **Port**: `4703`
> **Stack**: Python · FastAPI · Pydantic · httpx
> **Layer**: AI Orchestration Plane (Layer 4)
> **Status**: Foundation — Implemented ✅

---

## Overview

The AI Model Router is a **foundational** service in the NEXUS AI platform. It acts as the intelligent gateway between the AI Gateway Service (port 4700) and the downstream AI providers. Every AI request in the NEXUS ecosystem passes through this router, which classifies the task and selects the optimal model based on four constraint axes:

| Constraint | Description |
|---|---|
| **Task Type** | `reasoning`, `generation`, `retrieval`, `classification`, `prediction`, `multimodal`, `voice`, `vision` |
| **Latency Priority** | `realtime` (forces low-latency models), `balanced`, `background` |
| **Privacy Sensitivity** | `public`, `sensitive`, `strict_sovereign` (forces local/on-premise models for child and health data) |
| **Cost Envelope** | `low_cost`, `balanced`, `high_performance` |

The router supports **automated failover**: if the primary model provider fails, the request is automatically re-routed to a fallback provider without client intervention.

---

## Architecture

```
┌─────────────────┐
│  AI Gateway     │  (port 4700)
│  Service        │
└────────┬────────┘
         │  POST /route
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI MODEL ROUTER (port 4703)                │
│                                                             │
│  ┌──────────┐   ┌────────────┐   ┌──────────┐              │
│  │Classifier│──▶│  Provider  │──▶│ Metrics  │              │
│  │  Engine  │   │   Client   │   │ + Audit  │              │
│  └──────────┘   └────────────┘   └──────────┘              │
│       │              │                │                     │
│       │         ┌────┴────┐          │                     │
│       │         │Failover │          │                     │
│       │         │  Logic  │          │                     │
│       │         └─────────┘          │                     │
└───────┼──────────────────────────────┼─────────────────────┘
        │                              │
        ▼                              ▼
  ┌───────────┐                 ┌─────────────────┐
  │ LLM APIs  │                 │ Audit &         │
  │ OpenAI    │                 │ Observability   │
  │ Anthropic │                 │ Service (4109)  │
  │ Gemini    │                 └─────────────────┘
  │ Local     │
  └───────────┘
```

---

## Supported Models

| Provider | Model | Use Case |
|---|---|---|
| **OpenAI** | `gpt-4o` | High-performance reasoning, multimodal, vision |
| **OpenAI** | `gpt-4o-mini` | Low-latency realtime chat, cost-efficient generation |
| **Anthropic** | `claude-3-5-sonnet` | Deep reasoning, balanced general tasks |
| **Anthropic** | `claude-3-5-haiku` | Realtime fallback, lightweight classification |
| **Google** | `gemini-1.5-pro` | Balanced general tasks, long-context retrieval |
| **Google** | `gemini-1.5-flash` | Low-cost generation, realtime with budget constraint |
| **Local** | `local-sovereign-phi3` | Strict privacy: child data, health data, sovereign deployments |

---

## Routing Rules

### Priority 1 — Privacy Sovereignty
If `privacy_sensitivity == "strict_sovereign"`, the router **always** selects `local-sovereign-phi3` regardless of other constraints. This ensures child data (COPPA), health data (HIPAA/GDPR), and sovereign deployments never leave the local infrastructure.

### Priority 2 — Realtime Latency
If `latency_priority == "realtime"` or `task_type == "voice"`, the router selects low-latency models:
- `low_cost` → `gemini-1.5-flash` (fallback: `gpt-4o-mini`)
- `balanced` / `high_performance` → `gpt-4o-mini` (fallback: `claude-3-5-haiku`)

### Priority 3 — Task Type
- **Reasoning** → `gpt-4o` / `claude-3-5-sonnet` / `gemini-1.5-flash` (depending on cost)
- **Multimodal / Vision** → `gpt-4o` (fallback: `gemini-1.5-pro`)

### Priority 4 — Cost Envelope (Default)
- `low_cost` → `gpt-4o-mini`
- `balanced` → `gemini-1.5-pro`
- `high_performance` → `claude-3-5-sonnet`

---

## API Reference

### `GET /health`

Health check endpoint.

**Response** `200 OK`
```json
{
  "status": "healthy",
  "service": "ai-model-router",
  "environment": "local",
  "port": 4703
}
```

### `POST /route`

Route an AI request to the optimal model.

**Request Body**
```json
{
  "prompt": "Explain photosynthesis to a 7-year-old",
  "task_type": "generation",
  "latency_priority": "balanced",
  "privacy_sensitivity": "strict_sovereign",
  "cost_envelope": "low_cost",
  "user_id": "user_abc123"
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | ✅ | — | The prompt to send to the model |
| `task_type` | enum | — | `generation` | `reasoning`, `generation`, `retrieval`, `classification`, `prediction`, `multimodal`, `voice`, `vision` |
| `latency_priority` | enum | — | `balanced` | `realtime`, `balanced`, `background` |
| `privacy_sensitivity` | enum | — | `public` | `public`, `sensitive`, `strict_sovereign` |
| `cost_envelope` | enum | — | `balanced` | `low_cost`, `balanced`, `high_performance` |
| `user_id` | string | — | `null` | User ID for audit trail |

**Response** `200 OK`
```json
{
  "routed_model": "local-sovereign-phi3",
  "provider": "local",
  "response_text": "[Simulated response from local-sovereign-phi3 (local)]...",
  "latency_ms": 52.31,
  "tokens_used": {
    "prompt_tokens": 15,
    "completion_tokens": 30,
    "total_tokens": 45
  },
  "cost_usd": 0.0,
  "explainability_summary": "Privacy sensitivity is strict_sovereign. Routed to local-sovereign-phi3 to comply with strict children and health sovereignty constraints.",
  "fallback_triggered": false
}
```

**Error Response** `502 Bad Gateway`
```json
{
  "detail": "AI model routing failed on both primary and fallback providers. Error: ..."
}
```

### `GET /route/chains`

Lists all pre-defined multi-model chain templates.

**Response** `200 OK`
```json
{
  "retrieval_then_reasoning": {
    "description": "Retrieves context with a fast model, then reasons deeply with a powerful model",
    "steps": [
      { "step_name": "context_retrieval", "model": "gemini-1.5-flash", "provider": "google" },
      { "step_name": "deep_reasoning", "model": "gpt-4o", "provider": "openai" }
    ]
  },
  "classify_then_generate": {
    "description": "Classifies intent with a lightweight model, then generates a tailored response",
    "steps": [
      { "step_name": "intent_classification", "model": "gpt-4o-mini", "provider": "openai" },
      { "step_name": "tailored_generation", "model": "claude-3-5-sonnet", "provider": "anthropic" }
    ]
  }
}
```

### `POST /route/chain`

Routes a query through a multi-model pipeline chain (combination of models).

**Request Body (Pre-defined Template)**
```json
{
  "prompt": "Explain Quantum Computing in simple terms",
  "chain_name": "retrieval_then_reasoning",
  "user_id": "user_123"
}
```

**Request Body (Custom Steps)**
```json
{
  "prompt": "Create an article outline",
  "chain_name": "custom",
  "custom_steps": [
    {
      "step_name": "outline_generation",
      "model": "gpt-4o-mini",
      "provider": "openai",
      "prompt_template": "Generate an outline for: {input}"
    },
    {
      "step_name": "outline_refinement",
      "model": "claude-3-5-haiku",
      "provider": "anthropic",
      "prompt_template": "Add details to this outline: {input}"
    }
  ]
}
```

**Response** `200 OK`
```json
{
  "chain_name": "retrieval_then_reasoning",
  "final_output": "[Simulated response from gpt-4o (openai)]...",
  "steps_completed": 2,
  "total_latency_ms": 112.5,
  "total_tokens": {
    "prompt_tokens": 40,
    "completion_tokens": 85,
    "total_tokens": 125
  },
  "total_cost_usd": 0.00142,
  "step_details": [
    {
      "step_index": 1,
      "step_name": "context_retrieval",
      "model": "gemini-1.5-flash",
      "provider": "google",
      "latency_ms": 50.2,
      "tokens": { "prompt": 15, "completion": 25, "total": 40 },
      "cost_usd": 0.000008,
      "output_preview": "[Simulated response]..."
    },
    {
      "step_index": 2,
      "step_name": "deep_reasoning",
      "model": "gpt-4o",
      "provider": "openai",
      "latency_ms": 62.3,
      "tokens": { "prompt": 25, "completion": 60, "total": 85 },
      "cost_usd": 0.001412,
      "output_preview": "[Simulated response]..."
    }
  ]
}
```

### `GET /admin/load-balancer`

Returns statistics and health status of all pools and provider instances.

**Response** `200 OK`
```json
{
  "pools": [
    {
      "provider": "openai",
      "total_instances": 2,
      "healthy_instances": 2,
      "instances": [
        {
          "instance_id": "openai-1",
          "healthy": true,
          "weight": 2,
          "total_requests": 142,
          "total_failures": 0
        },
        {
          "instance_id": "openai-2",
          "healthy": true,
          "weight": 1,
          "total_requests": 71,
          "total_failures": 0
        }
      ]
    }
  ]
}
```

### `GET /admin/routing-table`

Returns the currently active routing table mapping task types and budgets to model configurations.

### `POST /admin/routing-table/reload`

Hot-reloads the configurable routing table from disk config file (`config/routing_table.json`).

---

## Pricing

Cost is calculated per request using the token-based pricing table below (per 1,000,000 tokens):

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|---|---|---|
| `local-sovereign-phi3` | $0.00 | $0.00 |
| `gpt-4o` | $5.00 | $15.00 |
| `gpt-4o-mini` | $0.15 | $0.60 |
| `claude-3-5-sonnet` | $3.00 | $15.00 |
| `claude-3-5-haiku` | $0.25 | $1.25 |
| `gemini-1.5-pro` | $1.25 | $5.00 |
| `gemini-1.5-flash` | $0.075 | $0.30 |

---

## EU AI Act Compliance

Every routed request asynchronously dispatches an **audit compliance log** to the `audit-observability-service` (port 4109) containing:

- User ID
- Model name and provider
- Input length, token counts
- Latency and cost
- Explainability summary (human-readable justification of model selection)
- Whether a fallback was triggered

If the audit service is unreachable, the log is printed to the local console to maintain a complete audit trail without blocking the client response.

---

## Project Structure

```
ai-model-router/
├── main.py                  # FastAPI entrypoint (uvicorn server)
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variable template
├── README.md                # This file
├── src/
│   ├── __init__.py
│   ├── config.py            # Settings from environment variables
│   ├── models.py            # Pydantic request/response schemas
│   ├── classifier.py        # Routing rules engine
│   ├── providers.py         # LLM API clients + failover + simulation
│   └── metrics.py           # Cost calculation + audit log dispatch
├── tests/
│   ├── __init__.py
│   └── test_router.py       # 6 unit tests covering all routing paths
├── data-contracts/           # Future: Kafka event schemas
├── evaluations/              # Future: Model quality benchmarks
├── prompts/                  # Future: System prompt templates
├── schemas/                  # Future: Extended Pydantic schemas
└── workflows/                # Future: LangGraph workflow definitions
```

---

## Running Locally

### 1. Install dependencies
```bash
cd services/ai-services/ai-model-router
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env to add API keys if needed (optional — simulated mode works without keys)
```

### 3. Start the service
```bash
python main.py
```

The service will start on `http://localhost:4703`. Interactive API documentation is available at `http://localhost:4703/docs` (Swagger UI).

### 4. Run tests
```bash
python -m pytest -v
```

---

## Connections

### Upstream (receives requests from)
- **AI Gateway Service** (port 4700) — unified entrypoint for all AI requests
- **Multi-Agent Coordinator** (port 4704) — routes specialized agent tasks

### Downstream (routes to)
- **Health Advisor AI** (port 4800)
- **Education Intelligence AI** (port 4801)
- **Fitness & Life AI** (port 4802)
- **Finance + Business Growth AI** (port 4803)
- **Family Hub + Child Safety AI** (port 4804)
- **Emotional Intelligence** (port 4805)
- **Digital Twin Service** (port 4806)
- **Generational Memory AI** (port 4807)
- **Predictive Crisis AI** (port 4808)
- **Collective Intelligence** (port 4809)
- **Marketing Intelligence AI** (port 4810)
- **HR Talent AI** (port 4811)
- **Operations AI** (port 4812)
- **Translator + Culture AI** (port 4813)

### Observability
- **Audit & Observability Service** (port 4109) — receives compliance audit logs

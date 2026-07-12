# AI Model Router — Workflows

This folder documents the multi-model chain execution pipelines and agent workflows orchestrated by the AI Model Router.

---

## Implemented Workflows (`src/chain_router.py`)

The service provides a pipeline engine (`/route/chain`) that sequentially executes multiple models, feeding the output of one step into the prompt template of the next.

```
                    ┌─────────────────┐
                    │  User Prompt    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Step 1      │ ──▶ Model A (e.g. Gemini Flash)
                    └────────┬────────┘
                             │ (Output A)
                             ▼
                    ┌─────────────────┐
                    │     Step 2      │ ──▶ Model B (e.g. GPT-4o)
                    └────────┬────────┘
                             │ (Output B)
                             ▼
                    ┌─────────────────┐
                    │  Final Output   │
                    └─────────────────┘
```

The following templates are pre-defined and fully verified:

### 1. Retrieval then Reasoning (`retrieval_then_reasoning`)
- **Step 1: `context_retrieval`** (`gemini-1.5-flash` on `google`): Extracts and summarises key facts and relevant context from the raw user prompt.
- **Step 2: `deep_reasoning`** (`gpt-4o` on `openai`): Executes deep reasoning over the extracted context to formulate the final response.

### 2. Classify then Generate (`classify_then_generate`)
- **Step 1: `intent_classification`** (`gpt-4o-mini` on `openai`): Categorizes the query's intent (e.g. `health_query`, `finance_query`, `creative_request`).
- **Step 2: `tailored_generation`** (`claude-3-5-sonnet` on `anthropic`): Generates a highly specialized domain response matching the detected category.

### 3. Summarise then Translate (`summarise_then_translate`)
- **Step 1: `summarisation`** (`gemini-1.5-pro` on `google`): Distills long-form inputs into concise key summaries.
- **Step 2: `cultural_translation`** (`claude-3-5-sonnet` on `anthropic`): Translates the summary into the target language with full cultural and emotional context preserved.

### 4. Safety Screen then Respond (`safety_screen_then_respond`)
- **Step 1: `safety_screening`** (`local-sovereign-phi3` on `local`): Analyzes the prompt for child safety and sensitivity.
- **Step 2: `safe_response_generation`** (`gemini-1.5-pro` on `google`): Generates the response only if it passes the localized edge screening step.

---

## Future Workflows
- **LangGraph Integration**: Orchestrating cyclic graph agents for complex conversational tasks.
- **Parallel Step Execution**: Running independent workflow steps concurrently and joining their outputs before the final synthesis step.

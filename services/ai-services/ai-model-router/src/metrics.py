import httpx
import logging
from src.config import settings
from src.models import TokensUsed

logger = logging.getLogger("ai-model-router.metrics")

# Model pricing mapping per 1,000,000 tokens (prices in USD)
MODEL_PRICING = {
    "local-sovereign-phi3": {"input": 0.0, "output": 0.0},
    "gpt-4o": {"input": 5.0, "output": 15.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.6},
    "claude-3-5-sonnet": {"input": 3.0, "output": 15.0},
    "claude-3-5-haiku": {"input": 0.25, "output": 1.25},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.0},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.3},
    # NEXUS proprietary fine-tuned models (internal compute cost)
    "nexus-health-ft": {"input": 0.8, "output": 2.4},
    "nexus-education-ft": {"input": 0.8, "output": 2.4},
    "nexus-finance-ft": {"input": 0.8, "output": 2.4},
    "nexus-emotion-ft": {"input": 0.5, "output": 1.5},
}

def calculate_cost(model: str, tokens: TokensUsed) -> float:
    """
    Calculates estimated query cost in USD based on input/output tokens.
    """
    prices = MODEL_PRICING.get(model, {"input": 0.0, "output": 0.0})
    input_cost = (tokens.prompt_tokens / 1_000_000) * prices["input"]
    output_cost = (tokens.completion_tokens / 1_000_000) * prices["output"]
    return round(input_cost + output_cost, 6)

async def dispatch_compliance_audit_log(
    user_id: str,
    prompt: str,
    routed_model: str,
    provider: str,
    latency_ms: float,
    tokens: TokensUsed,
    cost_usd: float,
    justification: str,
    fallback_triggered: bool
):
    """
    Asynchronously dispatches compliance and observability logs to comply with EU AI Act.
    Posts to the audit-observability-service. If the audit service is down or unreachable,
    gracefully catches the error and logs it to local console/files to avoid blocking client requests.
    """
    log_payload = {
        "userId": user_id or "anonymous",
        "modelName": routed_model,
        "provider": provider,
        "inputLength": len(prompt),
        "latencyMs": latency_ms,
        "promptTokens": tokens.prompt_tokens,
        "completionTokens": tokens.completion_tokens,
        "costUsd": cost_usd,
        "explainabilitySummary": justification,
        "fallbackTriggered": fallback_triggered
    }
    
    logger.info(f"AI Decision: Routed to {routed_model} ({provider}) for user {user_id}. Justification: {justification}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.AUDIT_SERVICE_URL}/telemetry/ai-decision",
                json=log_payload,
                timeout=2.0
            )
            if response.status_code != 201 and response.status_code != 200:
                logger.warning(f"Audit log dispatch returned status code {response.status_code}")
    except Exception as e:
        # Graceful fallback: log locally
        logger.warning(f"Resilient Auditing: Could not dispatch log to audit-observability-service: {str(e)}")
        # Print for local docker-compose console stream visibility
        print(f"[AUDIT COMPLIANCE TELEMETRY]: {log_payload}")

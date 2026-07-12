from typing import Tuple
from src.models import RouterRequest
from src.routing_table import lookup_candidates

# Constants representing model names and providers
LOCAL_SOVEREIGN_MODEL = "local-sovereign-phi3"
LOCAL_PROVIDER = "local"

OPENAI_HIGH = "gpt-4o"
OPENAI_LOW = "gpt-4o-mini"
OPENAI_PROVIDER = "openai"

ANTHROPIC_HIGH = "claude-3-5-sonnet"
ANTHROPIC_LOW = "claude-3-5-haiku"
ANTHROPIC_PROVIDER = "anthropic"

GEMINI_HIGH = "gemini-1.5-pro"
GEMINI_LOW = "gemini-1.5-flash"
GEMINI_PROVIDER = "google"

# NEXUS proprietary domain fine-tuned models (PDF spec lines 655-661)
# These are fine-tuned on curated domain-specific datasets and improved via RLHF
NEXUS_PROVIDER = "nexus"
DOMAIN_FINE_TUNED_MODELS = {
    "health":    "nexus-health-ft",
    "education": "nexus-education-ft",
    "finance":   "nexus-finance-ft",
    "emotion":   "nexus-emotion-ft",
}

# Fallback foundation model for each domain fine-tuned model
DOMAIN_FALLBACK = {
    "health":    (ANTHROPIC_HIGH, ANTHROPIC_PROVIDER),
    "education": (GEMINI_HIGH, GEMINI_PROVIDER),
    "finance":   (OPENAI_HIGH, OPENAI_PROVIDER),
    "emotion":   (ANTHROPIC_LOW, ANTHROPIC_PROVIDER),
}

class RoutingDecision:
    def __init__(self, primary_model: str, primary_provider: str, fallback_model: str, fallback_provider: str, justification: str):
        self.primary_model = primary_model
        self.primary_provider = primary_provider
        self.fallback_model = fallback_model
        self.fallback_provider = fallback_provider
        self.justification = justification

def classify_and_route(request: RouterRequest) -> RoutingDecision:
    """
    Decides the primary and fallback LLM models based on NEXUS routing specifications:
    1. Privacy sensitivity ('strict_sovereign' forces local/sovereign models).
    2. Domain fine-tuned model routing (health, education, finance, emotion).
    3. Latency constraints (realtime prompts force low-latency models).
    4. Task types + cost envelope via configurable routing table.

    The routing table (src/routing_table.py) is data-driven and can be overridden
    via a JSON config file without code changes.
    """
    # 1. Privacy Check (Highest Priority)
    if request.privacy_sensitivity == "strict_sovereign":
        return RoutingDecision(
            primary_model=LOCAL_SOVEREIGN_MODEL,
            primary_provider=LOCAL_PROVIDER,
            fallback_model=LOCAL_SOVEREIGN_MODEL,
            fallback_provider=LOCAL_PROVIDER,
            justification="Privacy sensitivity is strict_sovereign. Routed to local-sovereign-phi3 to comply with strict children and health sovereignty constraints."
        )

    # 2. Domain Fine-Tuned Model Routing (PDF spec: "Domain Fine-Tuned Models are NEXUS's proprietary AI assets")
    if request.domain != "general" and request.domain in DOMAIN_FINE_TUNED_MODELS:
        ft_model = DOMAIN_FINE_TUNED_MODELS[request.domain]
        fb_model, fb_provider = DOMAIN_FALLBACK[request.domain]
        return RoutingDecision(
            primary_model=ft_model,
            primary_provider=NEXUS_PROVIDER,
            fallback_model=fb_model,
            fallback_provider=fb_provider,
            justification=f"Domain '{request.domain}' detected. Routed to NEXUS fine-tuned model {ft_model}; falling back to {fb_model} ({fb_provider})."
        )

    # 3. Latency/Voice check (Real-time demands low-latency models)
    if request.latency_priority == "realtime" or request.task_type == "voice":
        if request.cost_envelope == "low_cost":
            return RoutingDecision(
                primary_model=GEMINI_LOW,
                primary_provider=GEMINI_PROVIDER,
                fallback_model=OPENAI_LOW,
                fallback_provider=OPENAI_PROVIDER,
                justification="Realtime latency required with low cost constraint. Routed to gemini-1.5-flash; falling back to gpt-4o-mini."
            )
        else:
            # Balanced or High Performance realtime
            return RoutingDecision(
                primary_model=OPENAI_LOW,
                primary_provider=OPENAI_PROVIDER,
                fallback_model=ANTHROPIC_LOW,
                fallback_provider=ANTHROPIC_PROVIDER,
                justification="Realtime latency priority. Routed to low-latency gpt-4o-mini; falling back to claude-3-5-haiku."
            )

    # 4. Configurable Routing Table Lookup
    # This replaces the old hardcoded task_type / cost_envelope rules.
    # The table can be customised via config/routing_table.json without code changes.
    candidates = lookup_candidates(request.task_type, request.cost_envelope)

    if len(candidates) >= 2:
        primary_model, primary_provider = candidates[0]
        fallback_model, fallback_provider = candidates[1]
    elif len(candidates) == 1:
        primary_model, primary_provider = candidates[0]
        fallback_model, fallback_provider = candidates[0]
    else:
        # Ultimate fallback
        primary_model, primary_provider = GEMINI_HIGH, GEMINI_PROVIDER
        fallback_model, fallback_provider = ANTHROPIC_HIGH, ANTHROPIC_PROVIDER

    justification = (
        f"Task '{request.task_type}' with cost '{request.cost_envelope}' "
        f"routed via configurable routing table to {primary_model} ({primary_provider}); "
        f"falling back to {fallback_model} ({fallback_provider})."
    )

    return RoutingDecision(
        primary_model=primary_model,
        primary_provider=primary_provider,
        fallback_model=fallback_model,
        fallback_provider=fallback_provider,
        justification=justification
    )

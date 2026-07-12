# ─────────────────────────────────────────────────────────────────────
# NEXUS AI Model Router — Multi-Model Chain Router
# ─────────────────────────────────────────────────────────────────────
# PDF Spec (line 646): "The router then selects the optimal model —
# or combination of models — for that specific request."
#
# This module implements chain routing where multiple models are
# composed into a pipeline. Each step's output feeds into the next
# step's input, enabling complex workflows like:
#   retrieval → reasoning, classification → generation, etc.
# ─────────────────────────────────────────────────────────────────────

import time
import logging
from typing import List, Optional
from dataclasses import dataclass, field
from src.models import TokensUsed

logger = logging.getLogger("ai-model-router.chain_router")


@dataclass
class ChainStep:
    """A single step in a multi-model chain pipeline."""
    step_name: str
    model: str
    provider: str
    prompt_template: str  # Uses {input} placeholder for previous step's output
    temperature: float = 0.7


@dataclass
class ChainResult:
    """Result of a complete chain execution."""
    final_output: str
    total_tokens: TokensUsed
    total_cost_usd: float
    total_latency_ms: float
    steps_completed: int
    step_details: List[dict] = field(default_factory=list)
    chain_name: str = ""


# ── Pre-defined Chain Templates ──────────────────────────────────────
# These represent common multi-model patterns in the NEXUS ecosystem.

CHAIN_TEMPLATES = {
    "retrieval_then_reasoning": {
        "description": "Retrieves context with a fast model, then reasons deeply with a powerful model",
        "steps": [
            ChainStep(
                step_name="context_retrieval",
                model="gemini-1.5-flash",
                provider="google",
                prompt_template=(
                    "Extract and summarise the key facts, data points, and relevant context "
                    "from the following query. Be concise and structured:\n\n{input}"
                ),
                temperature=0.3,
            ),
            ChainStep(
                step_name="deep_reasoning",
                model="gpt-4o",
                provider="openai",
                prompt_template=(
                    "Using the following retrieved context, provide a thorough, well-reasoned "
                    "analysis and answer. Show your reasoning step by step.\n\n"
                    "Context:\n{input}\n\nOriginal query: {{original_prompt}}"
                ),
                temperature=0.7,
            ),
        ],
    },
    "classify_then_generate": {
        "description": "Classifies intent with a lightweight model, then generates a tailored response",
        "steps": [
            ChainStep(
                step_name="intent_classification",
                model="gpt-4o-mini",
                provider="openai",
                prompt_template=(
                    "Classify the following user message into exactly one category: "
                    "[health_query, education_query, finance_query, emotional_support, "
                    "general_information, creative_request, technical_question]. "
                    "Respond with ONLY the category name.\n\n{input}"
                ),
                temperature=0.1,
            ),
            ChainStep(
                step_name="tailored_generation",
                model="claude-3-5-sonnet",
                provider="anthropic",
                prompt_template=(
                    "The user's intent has been classified as: {input}\n\n"
                    "Based on this classification, provide an expert-level response "
                    "to the original query: {{original_prompt}}"
                ),
                temperature=0.7,
            ),
        ],
    },
    "summarise_then_translate": {
        "description": "Summarises long content, then translates the summary",
        "steps": [
            ChainStep(
                step_name="summarisation",
                model="gemini-1.5-pro",
                provider="google",
                prompt_template=(
                    "Provide a clear, comprehensive summary of the following content. "
                    "Preserve all key information and nuance:\n\n{input}"
                ),
                temperature=0.4,
            ),
            ChainStep(
                step_name="cultural_translation",
                model="claude-3-5-sonnet",
                provider="anthropic",
                prompt_template=(
                    "Translate the following summary with full cultural context and "
                    "emotional nuance preserved. Target language should be inferred "
                    "from the original query context:\n\n{input}\n\n"
                    "Original request: {{original_prompt}}"
                ),
                temperature=0.5,
            ),
        ],
    },
    "safety_screen_then_respond": {
        "description": "Screens content for child safety, then generates age-appropriate response",
        "steps": [
            ChainStep(
                step_name="safety_screening",
                model="local-sovereign-phi3",
                provider="local",
                prompt_template=(
                    "Analyse the following content for child safety. Rate the content as: "
                    "SAFE, NEEDS_ADAPTATION, or BLOCKED. If NEEDS_ADAPTATION, specify "
                    "what modifications are needed. Respond in structured format.\n\n{input}"
                ),
                temperature=0.1,
            ),
            ChainStep(
                step_name="safe_response_generation",
                model="gemini-1.5-pro",
                provider="google",
                prompt_template=(
                    "Safety screening result: {input}\n\n"
                    "Based on this safety assessment, generate an appropriate, "
                    "age-suitable response to: {{original_prompt}}"
                ),
                temperature=0.6,
            ),
        ],
    },
}


async def execute_chain(
    chain_name: str,
    original_prompt: str,
    call_llm_fn,
    calculate_cost_fn,
    custom_steps: Optional[List[ChainStep]] = None,
) -> ChainResult:
    """
    Executes a multi-model chain pipeline.

    Args:
        chain_name: Name of a pre-defined chain template, or "custom" for custom_steps.
        original_prompt: The user's original prompt.
        call_llm_fn: Async function(model, provider, prompt) -> (text, tokens).
        calculate_cost_fn: Function(model, tokens) -> cost_usd.
        custom_steps: Optional list of ChainStep objects for custom chains.

    Returns:
        ChainResult with the final output and aggregated metrics.
    """
    # Resolve chain steps
    if custom_steps:
        steps = custom_steps
    elif chain_name in CHAIN_TEMPLATES:
        steps = CHAIN_TEMPLATES[chain_name]["steps"]
    else:
        raise ValueError(f"Unknown chain template: '{chain_name}'. Available: {list(CHAIN_TEMPLATES.keys())}")

    total_tokens = TokensUsed()
    total_cost = 0.0
    step_details = []
    current_input = original_prompt
    chain_start = time.time()

    for i, step in enumerate(steps):
        step_start = time.time()

        # Build prompt: replace {input} with previous output, {{original_prompt}} with user's original
        prompt = step.prompt_template.replace("{input}", current_input)
        prompt = prompt.replace("{{original_prompt}}", original_prompt)

        logger.info(f"Chain '{chain_name}' step {i+1}/{len(steps)} '{step.step_name}': {step.model} ({step.provider})")

        try:
            response_text, tokens = await call_llm_fn(
                model=step.model,
                provider=step.provider,
                prompt=prompt
            )
        except Exception as e:
            logger.error(f"Chain step '{step.step_name}' failed: {e}")
            # Return partial result up to the failed step
            return ChainResult(
                final_output=f"[Chain Error] Step '{step.step_name}' failed: {str(e)}. Partial output from previous steps: {current_input}",
                total_tokens=total_tokens,
                total_cost_usd=total_cost,
                total_latency_ms=(time.time() - chain_start) * 1000,
                steps_completed=i,
                step_details=step_details,
                chain_name=chain_name,
            )

        step_latency = (time.time() - step_start) * 1000
        step_cost = calculate_cost_fn(step.model, tokens)

        # Aggregate metrics
        total_tokens.prompt_tokens += tokens.prompt_tokens
        total_tokens.completion_tokens += tokens.completion_tokens
        total_tokens.total_tokens += tokens.total_tokens
        total_cost += step_cost

        step_details.append({
            "step_index": i + 1,
            "step_name": step.step_name,
            "model": step.model,
            "provider": step.provider,
            "latency_ms": round(step_latency, 2),
            "tokens": {
                "prompt": tokens.prompt_tokens,
                "completion": tokens.completion_tokens,
                "total": tokens.total_tokens,
            },
            "cost_usd": step_cost,
            "output_preview": response_text[:200] + "..." if len(response_text) > 200 else response_text,
        })

        # Feed this step's output to the next step
        current_input = response_text

    total_latency = (time.time() - chain_start) * 1000

    logger.info(
        f"Chain '{chain_name}' completed: {len(steps)} steps, "
        f"{total_latency:.0f}ms, ${total_cost:.6f}"
    )

    return ChainResult(
        final_output=current_input,
        total_tokens=total_tokens,
        total_cost_usd=round(total_cost, 6),
        total_latency_ms=round(total_latency, 2),
        steps_completed=len(steps),
        step_details=step_details,
        chain_name=chain_name,
    )


def list_chain_templates() -> dict:
    """Returns all available chain templates with their descriptions and step summaries."""
    result = {}
    for name, template in CHAIN_TEMPLATES.items():
        result[name] = {
            "description": template["description"],
            "steps": [
                {
                    "step_name": s.step_name,
                    "model": s.model,
                    "provider": s.provider,
                }
                for s in template["steps"]
            ],
        }
    return result

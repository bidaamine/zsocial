import time
import httpx
import logging
from typing import Tuple, Dict, Any
from src.config import settings
from src.models import TokensUsed
from src.load_balancer import get_load_balancer

logger = logging.getLogger("ai-model-router.providers")

async def call_llm(model: str, provider: str, prompt: str) -> Tuple[str, TokensUsed]:
    """
    Executes the LLM request with load-balanced provider selection.
    If the provider key is configured and valid, attempts a real API request
    using a load-balanced instance. Otherwise, falls back to a simulated response.
    Supports a mock 'FORCE_FAILOVER' trigger for testing fallback behavior.
    """
    if "FORCE_FAILOVER" in prompt and provider == "openai":
        logger.warning(f"Simulating primary provider failure for model {model} on {provider}")
        raise httpx.ConnectError("Simulated connection failure for testing failover")
        
    start_time = time.time()
    lb = get_load_balancer()
    instance = lb.get_instance(provider)
    
    # 1. Check if we should call OpenAI
    if provider == "openai" and instance and instance.api_key and not instance.api_key.startswith("mock"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{instance.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {instance.api_key}"},
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7
                    },
                    timeout=settings.REQUEST_TIMEOUT_SEC
                )
                response.raise_for_status()
                data = response.json()
                text = data["choices"][0]["message"]["content"]
                usage = data["usage"]
                tokens = TokensUsed(
                    prompt_tokens=usage["prompt_tokens"],
                    completion_tokens=usage["completion_tokens"],
                    total_tokens=usage["total_tokens"]
                )
                lb.report_success(provider, instance.instance_id)
                return text, tokens
        except Exception as e:
            logger.error(f"OpenAI API call failed (instance {instance.instance_id}): {str(e)}")
            lb.report_failure(provider, instance.instance_id)
            raise e

    # 2. Check if we should call Anthropic
    elif provider == "anthropic" and instance and instance.api_key and not instance.api_key.startswith("mock"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{instance.base_url}/messages",
                    headers={
                        "x-api-key": instance.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 1024
                    },
                    timeout=settings.REQUEST_TIMEOUT_SEC
                )
                response.raise_for_status()
                data = response.json()
                text = data["content"][0]["text"]
                usage = data["usage"]
                tokens = TokensUsed(
                    prompt_tokens=usage["input_tokens"],
                    completion_tokens=usage["output_tokens"],
                    total_tokens=usage["input_tokens"] + usage["output_tokens"]
                )
                lb.report_success(provider, instance.instance_id)
                return text, tokens
        except Exception as e:
            logger.error(f"Anthropic API call failed (instance {instance.instance_id}): {str(e)}")
            lb.report_failure(provider, instance.instance_id)
            raise e

    # 3. Check if we should call Gemini
    elif provider == "google" and instance and instance.api_key and not instance.api_key.startswith("mock"):
        try:
            async with httpx.AsyncClient() as client:
                # Use Gemini Developer API Endpoint
                url = f"{instance.base_url}/models/{model}:generateContent?key={instance.api_key}"
                response = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}]
                    },
                    timeout=settings.REQUEST_TIMEOUT_SEC
                )
                response.raise_for_status()
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                
                # Gemini doesn't always return usage metadata directly in the basic content generation response
                # depending on API version, so we calculate an estimate if not present
                usage_metadata = data.get("usageMetadata", {})
                prompt_tokens = usage_metadata.get("promptTokenCount", int(len(prompt) / 4))
                completion_tokens = usage_metadata.get("candidatesTokenCount", int(len(text) / 4))
                
                tokens = TokensUsed(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens
                )
                lb.report_success(provider, instance.instance_id)
                return text, tokens
        except Exception as e:
            logger.error(f"Gemini API call failed (instance {instance.instance_id}): {str(e)}")
            lb.report_failure(provider, instance.instance_id)
            raise e

    # 4. Fallback to Local or Simulated Response
    # This is critical for zero-dependency local setup & offline tests
    simulated_response = generate_simulated_response(model, provider, prompt)
    prompt_words = len(prompt.split())
    completion_words = len(simulated_response.split())
    
    prompt_tokens = int(prompt_words * 1.3) + 5
    completion_tokens = int(completion_words * 1.3) + 5
    
    tokens = TokensUsed(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens
    )
    
    # Simulate a tiny delay for local/edge models
    time.sleep(0.05)
    return simulated_response, tokens

def generate_simulated_response(model: str, provider: str, prompt: str) -> str:
    """
    Generates a high-quality mock response tailored to the routed model and prompt context.
    """
    if "health" in prompt.lower() or "symptom" in prompt.lower():
        return (
            f"[Simulated response from {model} ({provider})]\n"
            "Based on the health inquiry, this is a simulated triage overview. Always consult a medical professional. "
            "Recommendation: Monitor hydration, track rest quality, and consult your primary care doctor if symptoms persist."
        )
    elif "math" in prompt.lower() or "calculate" in prompt.lower() or "reason" in prompt.lower():
        return (
            f"[Simulated response from {model} ({provider})]\n"
            "Step 1: Analyzed input query parameters.\n"
            "Step 2: Applied logical deduction steps.\n"
            "Result: The calculated optimum outcome satisfies the balanced constraint set."
        )
    elif "child" in prompt.lower() or "education" in prompt.lower() or "learn" in prompt.lower():
        return (
            f"[Simulated response from {model} ({provider})]\n"
            "Welcome to the adaptive learning module. Let's break down this concept into easy steps. "
            "Question: Can you tell me what you find most interesting about this topic?"
        )
    else:
        return (
            f"[Simulated response from {model} ({provider})]\n"
            "NEXUS AI Model Router successfully completed the request. This response was routed automatically "
            "to optimize cost, performance, and privacy."
        )

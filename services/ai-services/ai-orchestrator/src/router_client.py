"""Client for the ai-model-router.

Every LLM-backed decision the orchestrator makes goes through the router, so it is
classified, costed and audited centrally. The client is resilient: if the router is
unreachable it returns None and the caller falls back to a deterministic path.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from src.config import settings

logger = logging.getLogger("ai-orchestrator.router_client")


class RouterClient:
    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = (base_url or settings.AI_MODEL_ROUTER_URL).rstrip("/")

    async def generate(
        self,
        prompt: str,
        *,
        user_id: Optional[str] = None,
        task_type: str = "generation",
        domain: str = "general",
        latency_priority: str = "balanced",
        privacy_sensitivity: str = "sensitive",
        cost_envelope: str = "balanced",
    ) -> Optional[dict]:
        """Route a single prompt. Returns the router response dict, or None on failure."""
        payload = {
            "prompt": prompt,
            "task_type": task_type,
            "latency_priority": latency_priority,
            "privacy_sensitivity": privacy_sensitivity,
            "cost_envelope": cost_envelope,
            "domain": domain,
            "user_id": user_id,
        }
        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SEC) as client:
                resp = await client.post(f"{self.base_url}/route", json=payload)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:  # noqa: BLE001 - resilient by design
            logger.warning("ai-model-router call failed: %s", exc)
            return None


router_client = RouterClient()

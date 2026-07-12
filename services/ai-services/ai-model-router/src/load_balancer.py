# ─────────────────────────────────────────────────────────────────────
# NEXUS AI Model Router — Provider Load Balancer
# ─────────────────────────────────────────────────────────────────────
# PDF Spec (line 653): "automatic failover, load balancing, and
# provider-specific routing based on task type"
#
# This module implements weighted round-robin load balancing across
# multiple API keys / endpoints for the same provider, ensuring no
# single-provider dependency risk at the infrastructure level.
# ─────────────────────────────────────────────────────────────────────

import os
import logging
import threading
from typing import Dict, List, Optional, NamedTuple
from dataclasses import dataclass, field

logger = logging.getLogger("ai-model-router.load_balancer")


@dataclass
class ProviderInstance:
    """Represents a single provider endpoint/key instance."""
    instance_id: str
    api_key: str
    base_url: str
    weight: int = 1
    healthy: bool = True
    total_requests: int = 0
    total_failures: int = 0


@dataclass
class ProviderPool:
    """A pool of instances for a single provider (e.g. 'openai')."""
    provider_name: str
    instances: List[ProviderInstance] = field(default_factory=list)
    _current_index: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def add_instance(self, instance: ProviderInstance):
        self.instances.append(instance)
        logger.info(
            f"Added instance '{instance.instance_id}' to pool '{self.provider_name}' "
            f"(weight={instance.weight}, total instances={len(self.instances)})"
        )

    def next_instance(self) -> Optional[ProviderInstance]:
        """
        Weighted round-robin selection. Skips unhealthy instances.
        Returns None if no healthy instances are available.
        """
        with self._lock:
            healthy = [i for i in self.instances if i.healthy]
            if not healthy:
                return None

            # Build weighted list
            weighted = []
            for inst in healthy:
                weighted.extend([inst] * inst.weight)

            if not weighted:
                return None

            selected = weighted[self._current_index % len(weighted)]
            self._current_index = (self._current_index + 1) % len(weighted)
            selected.total_requests += 1
            return selected

    def mark_unhealthy(self, instance_id: str):
        """Mark an instance as unhealthy after repeated failures."""
        for inst in self.instances:
            if inst.instance_id == instance_id:
                inst.healthy = False
                inst.total_failures += 1
                logger.warning(f"Instance '{instance_id}' in pool '{self.provider_name}' marked UNHEALTHY")
                break

    def mark_healthy(self, instance_id: str):
        """Restore an instance to healthy status (e.g. after a health check passes)."""
        for inst in self.instances:
            if inst.instance_id == instance_id:
                inst.healthy = True
                logger.info(f"Instance '{instance_id}' in pool '{self.provider_name}' restored to HEALTHY")
                break

    def get_stats(self) -> Dict:
        """Returns pool statistics for the admin API."""
        return {
            "provider": self.provider_name,
            "total_instances": len(self.instances),
            "healthy_instances": sum(1 for i in self.instances if i.healthy),
            "instances": [
                {
                    "instance_id": i.instance_id,
                    "healthy": i.healthy,
                    "weight": i.weight,
                    "total_requests": i.total_requests,
                    "total_failures": i.total_failures,
                }
                for i in self.instances
            ],
        }


class LoadBalancer:
    """
    Global load balancer that manages provider pools.

    Providers are auto-discovered from environment variables:
        OPENAI_API_KEY, OPENAI_API_KEY_2, OPENAI_API_KEY_3 ...
        ANTHROPIC_API_KEY, ANTHROPIC_API_KEY_2, ...
        GEMINI_API_KEY, GEMINI_API_KEY_2, ...

    Each extra key creates an additional instance in the provider's pool.
    Weights can be set via OPENAI_WEIGHT_1=2, OPENAI_WEIGHT_2=1, etc.
    """

    # Default API base URLs per provider
    DEFAULT_BASE_URLS = {
        "openai": "https://api.openai.com/v1",
        "anthropic": "https://api.anthropic.com/v1",
        "google": "https://generativelanguage.googleapis.com/v1beta",
        "nexus": "http://localhost:4710",
        "local": "http://localhost:4720",
    }

    def __init__(self):
        self._pools: Dict[str, ProviderPool] = {}
        self._discover_from_env()

    def _discover_from_env(self):
        """
        Auto-discovers provider instances from environment variables.
        Supports:
          - OPENAI_API_KEY (primary), OPENAI_API_KEY_2, OPENAI_API_KEY_3 (additional)
          - OPENAI_WEIGHT_1=2 (weight for primary), OPENAI_WEIGHT_2=1 etc.
          - Same pattern for ANTHROPIC_, GEMINI_
        """
        provider_env_map = {
            "openai": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GEMINI_API_KEY",
        }

        for provider_name, env_prefix in provider_env_map.items():
            pool = ProviderPool(provider_name=provider_name)

            # Primary key
            primary_key = os.getenv(env_prefix, "")
            if primary_key:
                weight = int(os.getenv(f"{env_prefix.split('_API_KEY')[0]}_WEIGHT_1", "1"))
                base_url = os.getenv(
                    f"{env_prefix.split('_API_KEY')[0]}_BASE_URL",
                    self.DEFAULT_BASE_URLS.get(provider_name, "")
                )
                pool.add_instance(ProviderInstance(
                    instance_id=f"{provider_name}-1",
                    api_key=primary_key,
                    base_url=base_url,
                    weight=weight,
                ))

            # Additional keys: _2, _3, ... up to _10
            for i in range(2, 11):
                extra_key = os.getenv(f"{env_prefix}_{i}", "")
                if extra_key:
                    weight = int(os.getenv(f"{env_prefix.split('_API_KEY')[0]}_WEIGHT_{i}", "1"))
                    base_url = os.getenv(
                        f"{env_prefix.split('_API_KEY')[0]}_BASE_URL_{i}",
                        self.DEFAULT_BASE_URLS.get(provider_name, "")
                    )
                    pool.add_instance(ProviderInstance(
                        instance_id=f"{provider_name}-{i}",
                        api_key=extra_key,
                        base_url=base_url,
                        weight=weight,
                    ))

            self._pools[provider_name] = pool

        # Always register local and nexus pools (no API key needed)
        for internal_provider in ["local", "nexus"]:
            if internal_provider not in self._pools:
                pool = ProviderPool(provider_name=internal_provider)
                pool.add_instance(ProviderInstance(
                    instance_id=f"{internal_provider}-1",
                    api_key="",
                    base_url=self.DEFAULT_BASE_URLS.get(internal_provider, ""),
                    weight=1,
                ))
                self._pools[internal_provider] = pool

        total = sum(len(p.instances) for p in self._pools.values())
        logger.info(f"Load balancer initialised: {len(self._pools)} provider pools, {total} total instances")

    def get_instance(self, provider: str) -> Optional[ProviderInstance]:
        """
        Gets the next healthy instance for a provider using weighted round-robin.
        Returns None if the provider has no pool or all instances are unhealthy.
        """
        pool = self._pools.get(provider)
        if pool is None:
            return None
        return pool.next_instance()

    def report_failure(self, provider: str, instance_id: str):
        """Reports a failure for a specific instance. After 3 consecutive failures, marks unhealthy."""
        pool = self._pools.get(provider)
        if pool:
            for inst in pool.instances:
                if inst.instance_id == instance_id:
                    inst.total_failures += 1
                    # Auto-circuit-break after 3 consecutive failures
                    if inst.total_failures >= 3 and inst.healthy:
                        pool.mark_unhealthy(instance_id)
                        logger.warning(
                            f"Circuit breaker triggered for {instance_id}: "
                            f"{inst.total_failures} failures"
                        )
                    break

    def report_success(self, provider: str, instance_id: str):
        """Reports a success, resetting the failure counter."""
        pool = self._pools.get(provider)
        if pool:
            for inst in pool.instances:
                if inst.instance_id == instance_id:
                    # Reset failure count on success
                    inst.total_failures = 0
                    if not inst.healthy:
                        pool.mark_healthy(instance_id)
                    break

    def get_all_stats(self) -> List[Dict]:
        """Returns statistics for all provider pools (used by admin API)."""
        return [pool.get_stats() for pool in self._pools.values()]

    def get_pool(self, provider: str) -> Optional[ProviderPool]:
        """Returns the pool for a given provider."""
        return self._pools.get(provider)


# ── Singleton ────────────────────────────────────────────────────────
_load_balancer: Optional[LoadBalancer] = None


def get_load_balancer() -> LoadBalancer:
    """Returns the singleton load balancer instance."""
    global _load_balancer
    if _load_balancer is None:
        _load_balancer = LoadBalancer()
    return _load_balancer

# ─────────────────────────────────────────────────────────────────────
# NEXUS AI Model Router — Configurable Routing Table
# ─────────────────────────────────────────────────────────────────────
# PDF Spec (line 653-654): "provider-specific routing based on task type"
#
# This module replaces hard-coded classifier rules with a data-driven
# routing table that operators can customise via YAML or environment
# overrides without code changes.
# ─────────────────────────────────────────────────────────────────────

import os
import json
import logging
from typing import Dict, List, Tuple, Optional
from pathlib import Path

logger = logging.getLogger("ai-model-router.routing_table")

# ── Default Routing Table ────────────────────────────────────────────
# Structure: routing_rules[task_type][cost_envelope] → list of (model, provider) candidates
# The classifier picks the first entry as primary and second as fallback.
# Operators can override this by placing a routing_table.json in the config dir.

DEFAULT_ROUTING_TABLE: Dict[str, Dict[str, List[Tuple[str, str]]]] = {
    # ── Reasoning tasks ──
    "reasoning": {
        "high_performance": [
            ("gpt-4o", "openai"),
            ("claude-3-5-sonnet", "anthropic"),
            ("gemini-1.5-pro", "google"),
        ],
        "balanced": [
            ("claude-3-5-sonnet", "anthropic"),
            ("gemini-1.5-pro", "google"),
            ("gpt-4o", "openai"),
        ],
        "low_cost": [
            ("gemini-1.5-flash", "google"),
            ("gpt-4o-mini", "openai"),
            ("claude-3-5-haiku", "anthropic"),
        ],
    },
    # ── Generation tasks ──
    "generation": {
        "high_performance": [
            ("claude-3-5-sonnet", "anthropic"),
            ("gpt-4o", "openai"),
            ("gemini-1.5-pro", "google"),
        ],
        "balanced": [
            ("gemini-1.5-pro", "google"),
            ("claude-3-5-sonnet", "anthropic"),
            ("gpt-4o-mini", "openai"),
        ],
        "low_cost": [
            ("gpt-4o-mini", "openai"),
            ("gemini-1.5-flash", "google"),
            ("claude-3-5-haiku", "anthropic"),
        ],
    },
    # ── Retrieval tasks ──
    "retrieval": {
        "high_performance": [
            ("gemini-1.5-pro", "google"),
            ("gpt-4o", "openai"),
            ("claude-3-5-sonnet", "anthropic"),
        ],
        "balanced": [
            ("gemini-1.5-pro", "google"),
            ("claude-3-5-sonnet", "anthropic"),
            ("gpt-4o-mini", "openai"),
        ],
        "low_cost": [
            ("gemini-1.5-flash", "google"),
            ("gpt-4o-mini", "openai"),
            ("claude-3-5-haiku", "anthropic"),
        ],
    },
    # ── Classification tasks ──
    "classification": {
        "high_performance": [
            ("claude-3-5-sonnet", "anthropic"),
            ("gpt-4o", "openai"),
            ("gemini-1.5-pro", "google"),
        ],
        "balanced": [
            ("gpt-4o-mini", "openai"),
            ("gemini-1.5-flash", "google"),
            ("claude-3-5-haiku", "anthropic"),
        ],
        "low_cost": [
            ("gemini-1.5-flash", "google"),
            ("claude-3-5-haiku", "anthropic"),
            ("gpt-4o-mini", "openai"),
        ],
    },
    # ── Prediction tasks ──
    "prediction": {
        "high_performance": [
            ("gpt-4o", "openai"),
            ("claude-3-5-sonnet", "anthropic"),
            ("gemini-1.5-pro", "google"),
        ],
        "balanced": [
            ("gemini-1.5-pro", "google"),
            ("gpt-4o", "openai"),
            ("claude-3-5-sonnet", "anthropic"),
        ],
        "low_cost": [
            ("gpt-4o-mini", "openai"),
            ("gemini-1.5-flash", "google"),
            ("claude-3-5-haiku", "anthropic"),
        ],
    },
    # ── Multimodal tasks ──
    "multimodal": {
        "high_performance": [
            ("gpt-4o", "openai"),
            ("gemini-1.5-pro", "google"),
            ("claude-3-5-sonnet", "anthropic"),
        ],
        "balanced": [
            ("gpt-4o", "openai"),
            ("gemini-1.5-pro", "google"),
            ("claude-3-5-sonnet", "anthropic"),
        ],
        "low_cost": [
            ("gpt-4o-mini", "openai"),
            ("gemini-1.5-flash", "google"),
            ("claude-3-5-haiku", "anthropic"),
        ],
    },
    # ── Vision tasks ──
    "vision": {
        "high_performance": [
            ("gpt-4o", "openai"),
            ("gemini-1.5-pro", "google"),
            ("claude-3-5-sonnet", "anthropic"),
        ],
        "balanced": [
            ("gpt-4o", "openai"),
            ("gemini-1.5-pro", "google"),
            ("claude-3-5-sonnet", "anthropic"),
        ],
        "low_cost": [
            ("gpt-4o-mini", "openai"),
            ("gemini-1.5-flash", "google"),
            ("claude-3-5-haiku", "anthropic"),
        ],
    },
    # ── Voice tasks (always low-latency preference) ──
    "voice": {
        "high_performance": [
            ("gpt-4o-mini", "openai"),
            ("claude-3-5-haiku", "anthropic"),
            ("gemini-1.5-flash", "google"),
        ],
        "balanced": [
            ("gpt-4o-mini", "openai"),
            ("claude-3-5-haiku", "anthropic"),
            ("gemini-1.5-flash", "google"),
        ],
        "low_cost": [
            ("gemini-1.5-flash", "google"),
            ("gpt-4o-mini", "openai"),
            ("claude-3-5-haiku", "anthropic"),
        ],
    },
}


def _find_config_file() -> Optional[Path]:
    """
    Looks for a custom routing_table.json in these locations (priority order):
    1. ROUTING_TABLE_PATH environment variable
    2. ./config/routing_table.json (relative to service root)
    3. Falls back to built-in DEFAULT_ROUTING_TABLE
    """
    env_path = os.getenv("ROUTING_TABLE_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists():
            return p

    local_path = Path(__file__).parent.parent / "config" / "routing_table.json"
    if local_path.exists():
        return local_path

    return None


def _parse_config_file(config_path: Path) -> Dict[str, Dict[str, List[Tuple[str, str]]]]:
    """
    Parses a JSON routing table file. Expected format:
    {
        "reasoning": {
            "high_performance": [["gpt-4o", "openai"], ["claude-3-5-sonnet", "anthropic"]],
            ...
        },
        ...
    }
    """
    try:
        with open(config_path, "r") as f:
            raw = json.load(f)

        table = {}
        for task_type, cost_map in raw.items():
            table[task_type] = {}
            for cost_env, candidates in cost_map.items():
                table[task_type][cost_env] = [
                    (c[0], c[1]) for c in candidates if len(c) >= 2
                ]
        logger.info(f"Loaded custom routing table from {config_path} ({len(table)} task types)")
        return table
    except Exception as e:
        logger.error(f"Failed to parse custom routing table at {config_path}: {e}. Using defaults.")
        return DEFAULT_ROUTING_TABLE


# ── Singleton Table ──────────────────────────────────────────────────
_routing_table: Optional[Dict[str, Dict[str, List[Tuple[str, str]]]]] = None


def get_routing_table() -> Dict[str, Dict[str, List[Tuple[str, str]]]]:
    """
    Returns the active routing table. Loads from config file on first call,
    then caches for the lifetime of the process.
    """
    global _routing_table
    if _routing_table is None:
        config_file = _find_config_file()
        if config_file:
            _routing_table = _parse_config_file(config_file)
        else:
            _routing_table = DEFAULT_ROUTING_TABLE
            logger.info("Using built-in default routing table (no custom config found)")
    return _routing_table


def reload_routing_table() -> Dict[str, Dict[str, List[Tuple[str, str]]]]:
    """
    Forces a reload of the routing table from disk. Useful for hot-reloads
    via admin API without restarting the service.
    """
    global _routing_table
    _routing_table = None
    return get_routing_table()


def lookup_candidates(task_type: str, cost_envelope: str) -> List[Tuple[str, str]]:
    """
    Returns the ordered list of (model, provider) candidates for a given
    task_type and cost_envelope. Falls back to the 'generation/balanced'
    default if the exact combination is not found.
    """
    table = get_routing_table()

    # Try exact match
    if task_type in table and cost_envelope in table[task_type]:
        return table[task_type][cost_envelope]

    # Fallback: try task_type with balanced cost
    if task_type in table and "balanced" in table[task_type]:
        logger.warning(f"Cost envelope '{cost_envelope}' not found for task '{task_type}', falling back to 'balanced'")
        return table[task_type]["balanced"]

    # Fallback: generation/balanced as ultimate default
    logger.warning(f"Task type '{task_type}' not in routing table, falling back to 'generation/balanced'")
    return table.get("generation", {}).get("balanced", [
        ("gemini-1.5-pro", "google"),
        ("claude-3-5-sonnet", "anthropic"),
    ])

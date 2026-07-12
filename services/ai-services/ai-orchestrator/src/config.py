import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Runtime configuration for the AI Life Orchestrator."""

    # ── Service ───────────────────────────────────────────────
    PORT: int = int(os.getenv("PORT", "4700"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    ENV: str = os.getenv("ENV", "local")

    # ── Downstream services ───────────────────────────────────
    # The orchestrator reasons *through* the ai-model-router rather than calling
    # LLM providers directly, so every AI decision is routed, costed and audited.
    AI_MODEL_ROUTER_URL: str = os.getenv("AI_MODEL_ROUTER_URL", "http://localhost:4703")
    AUDIT_SERVICE_URL: str = os.getenv("AUDIT_SERVICE_URL", "http://localhost:4109")
    REQUEST_TIMEOUT_SEC: float = float(os.getenv("REQUEST_TIMEOUT_SEC", "10.0"))

    # ── Background inference loop ──────────────────────────────
    # PDF spec: "The Orchestrator runs a continuous inference loop every 15 minutes."
    ORCHESTRATION_INTERVAL_SEC: int = int(os.getenv("ORCHESTRATION_INTERVAL_SEC", "900"))
    ENABLE_SCHEDULER: bool = os.getenv("ENABLE_SCHEDULER", "true").lower() == "true"

    # A signal older than this is ignored when building the *current* life-state.
    SIGNAL_FRESHNESS_SEC: int = int(os.getenv("SIGNAL_FRESHNESS_SEC", str(24 * 3600)))
    # How many life-state snapshots to retain per user for trend (strategic horizon).
    LIFE_STATE_HISTORY: int = int(os.getenv("LIFE_STATE_HISTORY", "96"))

    # ── Priority engine weights ───────────────────────────────
    PRIORITY_URGENCY_WEIGHT: float = float(os.getenv("PRIORITY_URGENCY_WEIGHT", "0.45"))
    PRIORITY_IMPORTANCE_WEIGHT: float = float(os.getenv("PRIORITY_IMPORTANCE_WEIGHT", "0.35"))
    PRIORITY_READINESS_WEIGHT: float = float(os.getenv("PRIORITY_READINESS_WEIGHT", "0.20"))
    # Above this stress level the orchestrator stops adding demanding tasks and
    # starts deferring / simplifying (PDF: "it will not add more tasks to your plate").
    STRESS_PROTECTION_THRESHOLD: float = float(os.getenv("STRESS_PROTECTION_THRESHOLD", "0.6"))


settings = Settings()

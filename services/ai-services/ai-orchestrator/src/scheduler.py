"""Background inference loop.

PDF: "The Orchestrator runs a continuous inference loop every 15 minutes in the
background." Iterates every known (active) user and runs a full orchestration cycle,
so life-state, insights, briefings and proactive actions stay current without a
request. Disabled in tests via ENABLE_SCHEDULER=false.
"""
from __future__ import annotations

import asyncio
import logging

from src.config import settings
from src.orchestrator import run_cycle
from src.repository import repository

logger = logging.getLogger("ai-orchestrator.scheduler")


class OrchestrationScheduler:
    def __init__(self, interval_sec: int | None = None) -> None:
        self.interval = interval_sec or settings.ORCHESTRATION_INTERVAL_SEC
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    async def _loop(self) -> None:
        logger.info("Orchestration loop started (every %ss)", self.interval)
        while not self._stop.is_set():
            for user_id in repository.known_users():
                try:
                    await run_cycle(user_id)
                except Exception as exc:  # noqa: BLE001 - one user must not stop the loop
                    logger.error("Cycle failed for user %s: %s", user_id, exc)
            try:
                # Sleep responsively: wake immediately if stop() is called.
                await asyncio.wait_for(self._stop.wait(), timeout=self.interval)
            except asyncio.TimeoutError:
                pass
        logger.info("Orchestration loop stopped")

    def start(self) -> None:
        if not settings.ENABLE_SCHEDULER:
            logger.info("Scheduler disabled (ENABLE_SCHEDULER=false)")
            return
        if self._task is None:
            self._stop.clear()
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._stop.set()
        if self._task is not None:
            await self._task
            self._task = None


scheduler = OrchestrationScheduler()

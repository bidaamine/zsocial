"""In-memory persistence for the orchestrator.

Kept behind a small interface so a Postgres/Redis-backed implementation can be
dropped in later without touching the engines. Single-process, asyncio-friendly.
"""
from __future__ import annotations

from collections import defaultdict, deque
from datetime import timedelta
from typing import Deque, Dict, List, Optional

from src.config import settings
from src.models import ActionLogEntry, Briefing, LifeState, ProactiveAction, Signal
from src.timeutil import utcnow


class InMemoryRepository:
    def __init__(self) -> None:
        self._signals: Dict[str, List[Signal]] = defaultdict(list)
        self._life_states: Dict[str, Deque[LifeState]] = defaultdict(
            lambda: deque(maxlen=settings.LIFE_STATE_HISTORY)
        )
        self._briefings: Dict[str, Briefing] = {}
        self._actions: Dict[str, ProactiveAction] = {}
        self._action_log: List[ActionLogEntry] = []

    # ── Signals ───────────────────────────────────────────────
    def add_signal(self, signal: Signal) -> None:
        self._signals[signal.user_id].append(signal)

    def recent_signals(self, user_id: str, freshness_sec: Optional[int] = None) -> List[Signal]:
        freshness = settings.SIGNAL_FRESHNESS_SEC if freshness_sec is None else freshness_sec
        cutoff = utcnow() - timedelta(seconds=freshness)
        return [s for s in self._signals.get(user_id, []) if s.timestamp >= cutoff]

    def latest_by_metric(self, user_id: str, freshness_sec: Optional[int] = None) -> Dict[str, Signal]:
        """Most recent signal per metric within the freshness window."""
        latest: Dict[str, Signal] = {}
        for s in self.recent_signals(user_id, freshness_sec):
            existing = latest.get(s.metric)
            if existing is None or s.timestamp >= existing.timestamp:
                latest[s.metric] = s
        return latest

    def known_users(self) -> List[str]:
        return list(self._signals.keys())

    # ── Life-state history ────────────────────────────────────
    def save_life_state(self, state: LifeState) -> None:
        self._life_states[state.user_id].append(state)

    def latest_life_state(self, user_id: str) -> Optional[LifeState]:
        history = self._life_states.get(user_id)
        return history[-1] if history else None

    def life_state_history(self, user_id: str) -> List[LifeState]:
        return list(self._life_states.get(user_id, []))

    # ── Briefings ─────────────────────────────────────────────
    def save_briefing(self, briefing: Briefing) -> None:
        self._briefings[briefing.user_id] = briefing

    def latest_briefing(self, user_id: str) -> Optional[Briefing]:
        return self._briefings.get(user_id)

    # ── Actions + immutable log ───────────────────────────────
    def save_action(self, action: ProactiveAction) -> None:
        self._actions[action.id] = action

    def get_action(self, action_id: str) -> Optional[ProactiveAction]:
        return self._actions.get(action_id)

    def actions_for_user(self, user_id: str) -> List[ProactiveAction]:
        return sorted(
            [a for a in self._actions.values() if a.user_id == user_id],
            key=lambda a: a.created_at,
            reverse=True,
        )

    def append_log(self, entry: ActionLogEntry) -> None:
        # Append-only: entries are never mutated or removed.
        self._action_log.append(entry)

    def log_for_user(self, user_id: str) -> List[ActionLogEntry]:
        return [e for e in self._action_log if e.user_id == user_id]

    def log_for_action(self, action_id: str) -> List[ActionLogEntry]:
        return [e for e in self._action_log if e.action_id == action_id]


# Process-wide singleton (swap for a DI container / DB repo in production).
repository = InMemoryRepository()

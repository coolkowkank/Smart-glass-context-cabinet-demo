"""Demo customer: Lauri, 31, nine years with Nordea. All data is fictional.

The Cabinet lives in shared/lauri.json so the backend and the offline
frontend start from exactly the same data.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

from .domain.models import Cabinet, Entry, Source, Status

SHARED_DIR = Path(os.getenv("SHARED_DIR") or Path(__file__).resolve().parents[2] / "shared")

BABY_TEXT = "Expecting a baby next autumn"


@lru_cache(maxsize=None)
def _raw(name: str) -> str:
    return (SHARED_DIR / f"{name}.json").read_text(encoding="utf-8")


def lauri() -> Cabinet:
    return Cabinet(**json.loads(_raw("lauri")))


def baby_entry() -> Entry:
    return Entry(
        id="baby", source=Source.customer, status=Status.active, kind="note",
        title="Baby · autumn", detail=BABY_TEXT, created="2026-10-28",
    )


def personal_agent_sync_payload() -> dict:
    """What Lauri's Personal AI proposes in a sync: staged proposals plus the on-device filter log."""
    return json.loads(_raw("personal_agent_sync"))


def manual_context() -> dict:
    """M5: the goal Lauri types by hand, and which Nordea signals relate to which goals."""
    return json.loads(_raw("manual_context"))


def demo_menu() -> dict:
    """The Field & Fork lunch menu the glasses read in the restaurant scene."""
    return json.loads(_raw("menu_field_and_fork"))

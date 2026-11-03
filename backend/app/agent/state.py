from __future__ import annotations

import operator
from typing import Annotated, Any, Literal, TypedDict

Intent = Literal["readiness", "add_context", "audit", "scan", "menu", "sync"]


def per_turn(old: list | None, new: list | None) -> list:
    """Reducer for the trace: passing None in the turn input clears it,
    so each turn reports only its own path through the graph."""
    if new is None:
        return []
    return (old or []) + new


class AgentState(TypedDict, total=False):
    # input
    user_id: str
    question: str
    intent: Intent | None
    target_entry_id: str | None
    rephrase: bool
    menu: list[dict] | None
    # working data
    cabinet: dict[str, Any]
    readiness: dict[str, Any] | None
    suggestions: list[dict] | None
    # output
    whisper: dict[str, Any] | None
    tip: list[dict] | None
    spare: list[dict] | None
    new_entry: dict[str, Any] | None
    xray: list[list[dict]] | None
    signals: list[dict] | None
    menu_rating: dict[str, Any] | None
    sync_staging: dict[str, Any] | None
    anchored: dict[str, Any] | None
    partial: dict[str, Any] | None  # generic answer: flat goal without a target
    trace: Annotated[list[str], per_turn]
    # memory across turns (kept by the checkpointer)
    turns: Annotated[list[str], operator.add]

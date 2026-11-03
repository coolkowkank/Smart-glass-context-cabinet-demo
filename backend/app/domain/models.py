"""Domain models for the Context Cabinet.

A Cabinet is a list of entries. Each entry says where it came from (the
customer or Nordea), how fresh it is, and carries the structured data the
readiness model needs.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class Source(str, Enum):
    customer = "customer"
    nordea = "nordea"


class Status(str, Enum):
    active = "active"
    stale = "stale"
    needs_review = "needs_review"
    archived = "archived"


class CaptionPart(BaseModel):
    """One span of caption text. `source` cites where a fact came from;
    `tone` marks emphasis that is not a citation."""

    text: str
    source: Source | None = None
    tone: Literal["good", "warn"] | None = None


class Entry(BaseModel):
    id: str
    source: Source
    status: Status
    kind: str = Field(description="flat_goal | car_goal | income | savings | spending | note")
    title: str = Field(description="2-4 word card title")
    detail: str
    data: dict[str, Any] = Field(default_factory=dict)
    override_reason: str | None = None
    created: str | None = Field(default=None, description="ISO date")
    status_before_archive: Status | None = None
    synced_via: str | None = Field(default=None, description="'personal_ai' once verified through the Personal AI bridge")

    @property
    def is_archived(self) -> bool:
        return self.status == Status.archived


class Cabinet(BaseModel):
    user_id: str
    name: str
    context_on: bool = True
    entries: list[Entry]
    # Desync parks everything here: out of the Cabinet (the agent can't read it) until a re-sync.
    withheld: list[Entry] = Field(default_factory=list)

    def get(self, entry_id: str) -> Entry | None:
        return next((e for e in self.entries if e.id == entry_id), None)

    def live(self, kind: str | None = None) -> list[Entry]:
        return [e for e in self.entries if not e.is_archived and (kind is None or e.kind == kind)]


class Chip(BaseModel):
    label: str
    action: str


class Bubble(BaseModel):
    title: str
    short_title: str | None = None
    tone: Literal["green", "amber", "blue", "grey"]
    icon: str = "home"
    anchor: str = "building"
    badge: str | None = None


class Whisper(BaseModel):
    """What the glasses show: one bubble and one caption line."""

    bubble: Bubble | None
    caption: list[CaptionPart]
    dim: bool = False

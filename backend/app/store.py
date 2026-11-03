"""Cabinet storage.

`InMemoryCabinetStore` is enough for a prototype. Swap it for a database by
implementing the same methods; nothing else in the app touches storage.
"""
from __future__ import annotations

import threading
import uuid
from datetime import date
from typing import Callable

from .domain.models import Cabinet, Entry, Source, Status
from .seed import baby_entry, lauri, manual_context, personal_agent_sync_payload

SPRINT_REASON = "Temporary: Q3 busy work sprint"


class NotFound(KeyError):
    pass


class InMemoryCabinetStore:
    def __init__(self, seeds: dict[str, Callable[[], Cabinet]] | None = None):
        self._seeds = seeds or {"lauri": lauri}
        self._data: dict[str, Cabinet] = {}
        self._lock = threading.RLock()
        self.reset_all()

    # ---- reads -------------------------------------------------------
    def get(self, user_id: str) -> Cabinet:
        with self._lock:
            if user_id not in self._data:
                raise NotFound(user_id)
            return self._data[user_id].model_copy(deep=True)

    def _entry(self, cab: Cabinet, entry_id: str) -> Entry:
        e = cab.get(entry_id)
        if e is None:
            raise NotFound(entry_id)
        return e

    # ---- writes ------------------------------------------------------
    def _save(self, cab: Cabinet) -> Cabinet:
        self._data[cab.user_id] = cab
        return cab.model_copy(deep=True)

    def set_context(self, user_id: str, on: bool) -> Cabinet:
        with self._lock:
            cab = self.get(user_id)
            cab.context_on = on
            return self._save(cab)

    def archive(self, user_id: str, entry_id: str) -> Cabinet:
        with self._lock:
            cab = self.get(user_id)
            e = self._entry(cab, entry_id)
            if not e.is_archived:
                e.status_before_archive = e.status
                e.status = Status.archived
            return self._save(cab)

    def restore(self, user_id: str, entry_id: str) -> Cabinet:
        with self._lock:
            cab = self.get(user_id)
            e = self._entry(cab, entry_id)
            if e.is_archived:
                e.status = e.status_before_archive or Status.active
                e.status_before_archive = None
            return self._save(cab)

    def override(self, user_id: str, entry_id: str, reason: str | None) -> Cabinet:
        with self._lock:
            cab = self.get(user_id)
            e = self._entry(cab, entry_id)
            e.override_reason = reason
            if e.source == Source.nordea and not e.is_archived:
                e.status = Status.active if reason else Status.needs_review
            return self._save(cab)

    def add(self, user_id: str, title: str, text: str, kind: str = "note", entry_id: str | None = None) -> tuple[Cabinet, Entry]:
        with self._lock:
            cab = self.get(user_id)
            entry = Entry(
                id=entry_id or f"u-{uuid.uuid4().hex[:8]}", source=Source.customer, status=Status.active,
                kind=kind, title=title, detail=text, created=date.today().isoformat(),
            )
            cab.entries = [e for e in cab.entries if e.id != entry.id] + [entry]
            return self._save(cab), entry

    # ---- demo helpers ----------------------------------------------------
    def reset(self, user_id: str) -> Cabinet:
        with self._lock:
            return self._save(self._seeds[user_id]())

    def reset_all(self) -> None:
        with self._lock:
            self._data = {uid: make() for uid, make in self._seeds.items()}

    # ---- Personal AI sync (Zero-Trust Context Bridge) ---------------------
    def apply_sync(self, user_id: str, approved_ids: list[str] | None = None) -> Cabinet:
        """Commit the proposals Lauri approved in the airlock. None = the default selection.
        Nothing is written for proposals he unticked."""
        with self._lock:
            proposals = personal_agent_sync_payload()["proposals"]
            known = {p["id"] for p in proposals}
            if approved_ids is None:
                approved = {p["id"] for p in proposals if p.get("default_approved", True)}
            else:
                unknown = set(approved_ids) - known
                if unknown:
                    raise ValueError(f"Unknown proposal ids: {', '.join(sorted(unknown))}")
                approved = set(approved_ids)
            cab = self.get(user_id)
            self._restore_withheld(cab)
            for p in proposals:
                if p["id"] not in approved:
                    continue
                t = cab.get(p["target_entry_id"])
                if t is None and p["action"] == "upsert_goal" and p.get("entry"):
                    # The goal only existed in the Personal AI: create it in Side A.
                    t = Entry(**p["entry"])
                    cab.entries.insert(0, t)
                if t is None:
                    continue
                act = p["action"]
                if act == "upsert_goal" and p.get("entry"):
                    # A goal typed by hand gets completed with what the Personal AI knows.
                    t.title, t.detail = p["entry"]["title"], p["entry"]["detail"]
                    t.data = {**t.data, **p["entry"]["data"]}
                if act == "upsert_goal" and t.is_archived:
                    t.status, t.status_before_archive = Status.active, None
                elif act == "archive_stale" and not t.is_archived:
                    t.status_before_archive, t.status = t.status, Status.archived
                elif act == "override_signal":
                    t.override_reason = p.get("override_reason") or SPRINT_REASON
                    if not t.is_archived:
                        t.status = Status.active
                elif act == "acknowledge_signal" and not t.is_archived:
                    t.status = Status.active
                t.synced_via = "personal_ai"
            return self._save(cab)

    @staticmethod
    def _restore_withheld(cab: Cabinet) -> None:
        """Re-sync brings back what a desync parked; entries added since then win on id."""
        have = {e.id for e in cab.entries}
        cab.entries += [e for e in cab.withheld if e.id not in have]
        cab.withheld = []

    def desync(self, user_id: str) -> Cabinet:
        """Disconnect: the Cabinet empties (Lauri's context and Nordea's). Nothing is deleted;
        it's parked until he syncs again."""
        with self._lock:
            cab = self.get(user_id)
            cab.withheld = cab.withheld + cab.entries
            cab.entries = []
            return self._save(cab)

    def add_goal(self, user_id: str, entry: dict) -> tuple[Cabinet, Entry]:
        """A goal Lauri types himself (Side A, no Personal AI)."""
        with self._lock:
            cab = self.get(user_id)
            e = Entry(**{**entry, "source": "customer"})
            cab.entries = [x for x in cab.entries if x.id != e.id] + [e]
            cab.withheld = [x for x in cab.withheld if x.id != e.id]
            return self._save(cab), e

    def nordea_contribute(self, user_id: str) -> tuple[Cabinet, list[Entry]]:
        """Nordea adds back only the signals related to the goals now in the Cabinet
        (a flat goal → savings). Everything else it knows stays out."""
        with self._lock:
            cab = self.get(user_id)
            related = manual_context()["nordea_related"]
            kinds = {k for g in cab.live() if g.source == Source.customer for k in related.get(g.kind, [])}
            moved = [e for e in cab.withheld if e.source == Source.nordea and e.kind in kinds]
            cab.withheld = [e for e in cab.withheld if e not in moved]
            cab.entries += moved
            return self._save(cab), moved

    def apply_demo_state(self, user_id: str, *, context_on: bool, car_archived: bool,
                         dining_overridden: bool, include_baby: bool, flat_archived: bool = False,
                         synced: bool = False, flat: bool = False, desynced: bool = False,
                         manual_flat: bool = False) -> Cabinet:
        """Put the cabinet in the state a storyboard moment expects.
        Customer-added notes other than the demo baby note are kept."""
        with self._lock:
            fresh = self._seeds[user_id]()
            current = self.get(user_id)
            extras = [e for e in current.entries if e.id.startswith("u-")]
            fresh.entries += extras
            fresh.context_on = context_on
            self._save(fresh)
            if flat:
                self.apply_sync(user_id, ["sync-flat"])
            if car_archived:
                self.archive(user_id, "car")
            if dining_overridden:
                self.override(user_id, "dining", SPRINT_REASON)
            if synced:
                self.apply_sync(user_id)
            if desynced:
                self.desync(user_id)
            if manual_flat:
                self.add_goal(user_id, manual_context()["entry"])
                self.nordea_contribute(user_id)
            if flat_archived:
                self.archive(user_id, "flat")
            if include_baby:
                cab = self.get(user_id)
                cab.entries.append(baby_entry())
                self._save(cab)
            return self.get(user_id)

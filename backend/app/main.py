"""HTTP API for the glasses UI.

User actions (archive, override, context on/off) change the Cabinet
directly. Questions, notes, audits and scans go through the LangGraph agent.
"""
from __future__ import annotations

import json
import os
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .agent import build_graph, turn_input
from .agent.llm import get_llm, provider_name
from .seed import demo_menu, manual_context
from .store import InMemoryCabinetStore, NotFound

DEFAULT_QUESTION = "Am I on track to buy this flat?"


class AskIn(BaseModel):
    question: str = DEFAULT_QUESTION
    rephrase: bool = True


class AddIn(BaseModel):
    text: str


class ContextIn(BaseModel):
    on: bool


class OverrideIn(BaseModel):
    reason: str | None = "Temporary: Q3 busy work sprint"


class DemoStateIn(BaseModel):
    context_on: bool = True
    car_archived: bool = False
    dining_overridden: bool = False
    include_baby: bool = False
    flat_archived: bool = False
    synced: bool = False
    flat: bool = False  # add only the flat goal (as if just that sync card was approved)
    desynced: bool = False  # Desync AI: the Cabinet is emptied
    manual_flat: bool = False  # Lauri typed the flat goal himself; Nordea added the related signal


class SyncApplyIn(BaseModel):
    """Proposal ids Lauri approved in the airlock. Omit to use the default selection."""
    approved_ids: list[str] | None = None


class MenuItem(BaseModel):
    id: str
    name: str | None = None
    section: str | None = None
    price: float


class MenuIn(BaseModel):
    """What the glasses read off a menu. Omit `items` to use the demo menu."""
    items: list[MenuItem] | None = None


def create_app(store: InMemoryCabinetStore | None = None, llm: Any = "env") -> FastAPI:
    store = store or InMemoryCabinetStore()
    llm = get_llm() if llm == "env" else llm
    graph = build_graph(store, llm)
    demo_enabled = os.getenv("DEMO_MODE", "1") != "0"
    session_salt = uuid.uuid4().hex[:6]  # fresh conversation memory per server start

    app = FastAPI(title="Nordea Context Cabinet API", version="0.1.0")
    origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

    def config(uid: str) -> dict:
        return {"configurable": {"thread_id": f"{uid}-{session_salt}"}}

    def guard(fn, *a, **kw):
        try:
            return fn(*a, **kw)
        except NotFound as ex:
            raise HTTPException(404, f"Not found: {ex.args[0]}") from ex

    def run(uid: str, **kw) -> dict:
        guard(store.get, uid)
        state = graph.invoke(turn_input(uid, **kw), config(uid))
        return {
            "intent": state.get("intent"),
            "readiness": state.get("readiness"),
            "whisper": state.get("whisper"),
            "tip": state.get("tip"),
            "spare": state.get("spare"),
            "suggestions": state.get("suggestions"),
            "new_entry": state.get("new_entry"),
            "xray": state.get("xray"),
            "signals": state.get("signals"),
            "menu_rating": state.get("menu_rating"),
            "sync_staging": state.get("sync_staging"),
            "anchored": state.get("anchored"),
            "partial": state.get("partial"),
            "cabinet": state.get("cabinet") or store.get(uid).model_dump(mode="json"),
            "trace": state.get("trace", []),
        }

    def answer(uid: str, rephrase: bool = False) -> dict:
        return run(uid, question=DEFAULT_QUESTION, intent="readiness", rephrase=rephrase)

    @app.get("/api/health")
    def health():
        return {"ok": True, "llm": provider_name(), "demo": demo_enabled}

    # ---- cabinet (direct user actions) --------------------------------------
    @app.get("/api/cabinet/{uid}")
    def get_cabinet(uid: str):
        return guard(store.get, uid).model_dump(mode="json")

    @app.post("/api/cabinet/{uid}/context")
    def set_context(uid: str, body: ContextIn):
        return guard(store.set_context, uid, body.on).model_dump(mode="json")

    @app.post("/api/cabinet/{uid}/entries/{eid}/archive")
    def archive(uid: str, eid: str):
        return guard(store.archive, uid, eid).model_dump(mode="json")

    @app.post("/api/cabinet/{uid}/entries/{eid}/restore")
    def restore(uid: str, eid: str):
        return guard(store.restore, uid, eid).model_dump(mode="json")

    @app.post("/api/cabinet/{uid}/entries/{eid}/override")
    def override(uid: str, eid: str, body: OverrideIn):
        return guard(store.override, uid, eid, body.reason).model_dump(mode="json")

    @app.delete("/api/cabinet/{uid}/entries/{eid}/override")
    def clear_override(uid: str, eid: str):
        return guard(store.override, uid, eid, None).model_dump(mode="json")

    # ---- agent ------------------------------------------------------------
    @app.post("/api/agent/{uid}/ask")
    def ask(uid: str, body: AskIn):
        return run(uid, question=body.question, rephrase=body.rephrase)

    @app.post("/api/agent/{uid}/answer")
    def answer_now(uid: str):
        """The standing question, answered from the current Cabinet."""
        return answer(uid)

    @app.post("/api/agent/{uid}/add")
    def add(uid: str, body: AddIn):
        if not body.text.strip():
            raise HTTPException(422, "Text is empty")
        return run(uid, question=body.text, intent="add_context")

    @app.post("/api/agent/{uid}/audit/{eid}")
    def audit(uid: str, eid: str):
        return run(uid, intent="audit", target_entry_id=eid)

    @app.post("/api/agent/{uid}/scan")
    def scan(uid: str):
        return run(uid, intent="scan")

    @app.post("/api/agent/{uid}/menu")
    def menu(uid: str, body: MenuIn | None = None):
        items = [i.model_dump() for i in body.items] if body and body.items else demo_menu()["items"]
        return run(uid, intent="menu", menu=items)

    # ---- Personal AI sync (Zero-Trust Context Bridge) -----------------------------
    @app.post("/api/agent/{uid}/sync/stage")
    def sync_stage(uid: str):
        """Step 1: the Personal AI's proposals land in the airlock. Nothing is saved yet."""
        return run(uid, intent="sync")

    @app.post("/api/cabinet/{uid}/sync/apply")
    def sync_apply(uid: str, body: SyncApplyIn | None = None):
        """Step 2: commit only what Lauri approved, then answer the standing question."""
        try:
            guard(store.apply_sync, uid, body.approved_ids if body else None)
        except ValueError as ex:
            raise HTTPException(422, str(ex)) from ex
        return answer(uid)

    @app.post("/api/cabinet/{uid}/desync")
    def desync(uid: str):
        """Desync AI: empty the Cabinet (parked, not deleted), then answer from nothing."""
        guard(store.desync, uid)
        return answer(uid)

    @app.post("/api/cabinet/{uid}/goals")
    def add_goal(uid: str, body: dict | None = None):
        """A goal Lauri types himself. Omit the body to add the demo goal ("Buy a flat in 18 months")."""
        guard(store.add_goal, uid, (body or {}).get("entry") or manual_context()["entry"])
        return answer(uid)

    @app.post("/api/cabinet/{uid}/nordea/contribute")
    def nordea_contribute(uid: str):
        """Nordea adds back only the signals related to the goals in the Cabinet."""
        _, moved = guard(store.nordea_contribute, uid)
        return {**answer(uid), "contributed": [e.model_dump(mode="json") for e in moved]}

    @app.post("/api/agent/{uid}/ask/stream")
    def ask_stream(uid: str, body: AskIn):
        """Server-sent events: one event per graph node as it finishes."""
        guard(store.get, uid)

        def events():
            for update in graph.stream(turn_input(uid, question=body.question, rephrase=body.rephrase),
                                       config(uid), stream_mode="updates"):
                for node, data in update.items():
                    yield f"event: node\ndata: {json.dumps({'node': node, 'update': data}, default=str)}\n\n"
            yield "event: done\ndata: {}\n\n"

        return StreamingResponse(events(), media_type="text/event-stream")

    # ---- demo choreography ----------------------------------------------------
    if demo_enabled:
        @app.post("/api/demo/{uid}/state")
        def demo_state(uid: str, body: DemoStateIn):
            guard(store.apply_demo_state, uid, **body.model_dump())
            return answer(uid)

        @app.post("/api/demo/{uid}/reset")
        def demo_reset(uid: str):
            guard(store.reset, uid)
            return answer(uid)

    return app


app = create_app()

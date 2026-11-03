"""The Context Cabinet agent, as a LangGraph StateGraph.

    START → route_intent → load_context ─┬─ no_context ────────────────────────→ END
                                         ├─ hygiene → compute_readiness → compose_whisper → END
                                         ├─ add_context ───────────────────────→ END
                                         ├─ audit ─────────────────────────────→ END
                                         ├─ scan ──────────────────────────────→ END
                                         ├─ rate_menu (a menu the camera read) → END
                                         └─ stage_sync (Personal AI proposals → airlock) → END

Numbers only ever come from `compute_readiness` and `rate_menu`. The LLM (optional) routes
free-form questions, rewrites captions within a guardrail, and shortens
notes into card titles.
"""
from __future__ import annotations

import logging
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from ..domain.menu import menu_whisper, rate_menu
from ..domain.models import Bubble, Cabinet, CaptionPart, Source, Whisper
from ..domain.readiness import Readiness, anchored_goal, partial_flat, readiness
from ..domain.whisper import (
    anchored_whisper, answer_whisper, partial_whisper, citation_caption, hygiene, no_context_whisper, no_goal_whisper, shorten_title,
    spare_caption, tip_caption, validate_caption,
)
from ..seed import BABY_TEXT, personal_agent_sync_payload
from ..store import InMemoryCabinetStore
from .state import AgentState

log = logging.getLogger(__name__)


# ---- structured outputs for the LLM -----------------------------------------
class IntentOut(BaseModel):
    intent: Literal["readiness", "add_context", "audit", "scan", "sync"]  # "menu" comes from the camera, not from speech
    entry_id: str | None = Field(default=None, description="Cabinet entry the user refers to, for audit")


class CaptionOut(BaseModel):
    parts: list[CaptionPart] = Field(description="Caption spans. Cite facts with source=customer or nordea.")


class TitleOut(BaseModel):
    title: str = Field(description="2-4 word card title, e.g. 'Baby · autumn'")


INTENT_PROMPT = """You route requests for banking smart glasses.
Intents:
- readiness: the user asks whether they are on track, can afford, how long until, etc.
- add_context: the user states a new fact or plan about their life to remember.
- audit: the user asks why the bank thinks something, or disputes a bank signal.
- scan: the user asks what the bank knows about them.
- sync: the user asks to sync or import context from their personal AI assistant.
Cabinet entry ids: {ids}. Set entry_id only for audit."""

CAPTION_PROMPT = """Write ONE caption line for smart glasses, max 8 words.
Use only these facts. Do not add, change or compute numbers.
Cite customer-owned facts with source=customer and bank facts with source=nordea.
Facts: {facts}"""

TITLE_PROMPT = """Turn the note into a 2-4 word card title for smart glasses.
Use ' · ' between the subject and its timing if there is one. Example:
'Expecting a baby next autumn' -> 'Baby · autumn'."""


def rule_intent(q: str) -> str:
    s = q.lower().strip()
    if "sync" in s or "personal ai" in s:
        return "sync"
    if any(w in s for w in ("why", "audit", "not right", "wrong")):
        return "audit"
    if any(w in s for w in ("what do you know", "scan", "what does nordea know")):
        return "scan"
    if s.endswith("?") or any(w in s for w in ("on track", "afford", "ready", "how long")):
        return "readiness"
    return "add_context"


def _parts(parts: list[CaptionPart]) -> list[dict]:
    return [p.model_dump(mode="json") for p in parts]


def build_graph(store: InMemoryCabinetStore, llm=None, checkpointer="memory"):
    """checkpointer: "memory" (default, keeps per-thread memory), None (no
    checkpointer, e.g. for LangGraph Studio which brings its own), or any
    LangGraph checkpointer such as a Postgres saver."""
    def route_intent(state: AgentState) -> dict:
        q = state.get("question") or ""
        out: dict = {"turns": [q] if q else []}
        if state.get("intent"):
            return {**out, "trace": ["route_intent:given"]}
        if llm is not None and q:
            try:
                ids = ", ".join(e.id for e in store.get(state["user_id"]).entries)
                res = llm.with_structured_output(IntentOut).invoke(
                    [SystemMessage(INTENT_PROMPT.format(ids=ids)), HumanMessage(q)]
                )
                return {**out, "intent": res.intent, "target_entry_id": res.entry_id, "trace": ["route_intent:llm"]}
            except Exception as ex:  # fall back to rules on any model error
                log.warning("intent LLM failed: %s", ex)
        return {**out, "intent": rule_intent(q), "trace": ["route_intent:rules"]}

    def load_context(state: AgentState) -> dict:
        cab = store.get(state["user_id"])
        return {"cabinet": cab.model_dump(mode="json"), "trace": ["load_context"]}

    def after_load(state: AgentState) -> str:
        intent = state.get("intent") or "readiness"
        if intent in ("readiness", "scan") and not state["cabinet"]["context_on"]:
            return "no_context"
        return {"readiness": "hygiene", "add_context": "add_context", "audit": "audit", "scan": "scan", "menu": "rate_menu", "sync": "stage_sync"}[intent]

    def no_context(state: AgentState) -> dict:
        return {"readiness": Readiness(known=False, missing=["context_off"]).as_dict(),
                "whisper": no_context_whisper().model_dump(mode="json"), "trace": ["no_context"]}

    def hygiene_node(state: AgentState) -> dict:
        return {"suggestions": hygiene(Cabinet(**state["cabinet"])), "trace": ["hygiene"]}

    def compute_readiness(state: AgentState) -> dict:
        r = readiness(Cabinet(**state["cabinet"]))
        return {"readiness": r.as_dict(), "trace": ["compute_readiness"]}

    def compose_whisper(state: AgentState) -> dict:
        r = Readiness(**state["readiness"])
        if not r.known:
            if "context_off" in r.missing:
                return {"whisper": no_context_whisper().model_dump(mode="json"), "trace": ["compose_whisper:unknown"]}
            fallback = anchored_goal(Cabinet(**state["cabinet"]))
            if fallback:  # no flat goal in the Cabinet yet: the agent anchors on the old car goal
                return {"whisper": anchored_whisper(fallback).model_dump(mode="json"), "anchored": fallback,
                        "trace": ["compose_whisper:anchored_on_old_goal"]}
            partial = partial_flat(Cabinet(**state["cabinet"]))
            if partial:  # thin Cabinet (goal typed by hand, Nordea's related signal only): a generic answer
                return {"whisper": partial_whisper(partial).model_dump(mode="json"), "anchored": None, "partial": partial,
                        "trace": ["compose_whisper:generic_thin_context"]}
            return {"whisper": no_goal_whisper().model_dump(mode="json"), "trace": ["compose_whisper:unknown"]}
        caption, how = citation_caption(r), "template"
        if llm is not None and state.get("rephrase"):
            try:
                facts = {"question": state.get("question"), "months": r.months, "horizon_months": r.horizon_months,
                         "spare_months": r.spare, "on_track": r.on_track, "asp_balance": r.balance,
                         "loan_estimate_reduced": r.loan_estimate_reduced}
                res = llm.with_structured_output(CaptionOut).invoke(
                    [SystemMessage(CAPTION_PROMPT.format(facts=facts)), HumanMessage(state.get("question") or "")]
                )
                ok, why = validate_caption(res.parts, r)
                if ok:
                    caption, how = res.parts, "llm"
                else:
                    how = f"guardrail_rejected:{why}"
            except Exception as ex:
                log.warning("caption LLM failed: %s", ex)
                how = "llm_error"
        return {
            "whisper": answer_whisper(r, caption).model_dump(mode="json"),
            "tip": _parts(tip_caption(r)),
            "spare": _parts(spare_caption(r)),
            "trace": [f"compose_whisper:{how}"],
        }

    def add_context(state: AgentState) -> dict:
        text = (state.get("question") or "").strip()
        title, how = shorten_title(text), "local"
        if llm is not None:
            try:
                res = llm.with_structured_output(TitleOut).invoke([SystemMessage(TITLE_PROMPT), HumanMessage(text)])
                t = res.title.strip()
                if 0 < len(t.split()) <= 5 and len(t) <= 32:
                    title, how = t, "llm"
            except Exception as ex:
                log.warning("title LLM failed: %s", ex)
        entry_id = "baby" if text.lower() == BABY_TEXT.lower() else None
        if entry_id:
            title = "Baby · autumn"
        cab, entry = store.add(state["user_id"], title, text, entry_id=entry_id)
        whisper = Whisper(bubble=Bubble(title=entry.title, tone="green", icon="pin", anchor="skyLeft"),
                          caption=[CaptionPart(text="Pinned.")])
        return {"cabinet": cab.model_dump(mode="json"), "new_entry": entry.model_dump(mode="json"),
                "whisper": whisper.model_dump(mode="json"), "trace": [f"add_context:{how}"]}

    def audit(state: AgentState) -> dict:
        cab = Cabinet(**state["cabinet"])
        target = cab.get(state.get("target_entry_id") or "") or next(iter(cab.live("spending")), None)
        if target is None:
            return {"xray": [], "trace": ["audit:not_found"]}
        lines = target.data.get("audit")
        if not lines:
            who = "You told us" if target.source == Source.customer else "Nordea saw"
            lines = [[{"text": f"{who}: "}, {"text": target.detail}]]
        return {"xray": lines, "target_entry_id": target.id, "trace": [f"audit:{target.id}"]}

    def rate_menu_node(state: AgentState) -> dict:
        rating = rate_menu(Cabinet(**state["cabinet"]), state.get("menu") or [])
        return {"menu_rating": rating, "whisper": menu_whisper(rating).model_dump(mode="json"),
                "trace": [f"rate_menu:{rating['over_count']}_over" if rating["known"] else "rate_menu:no_context"]}

    def stage_sync(state: AgentState) -> dict:
        """Personal AI sync, step 1: stage proposals in the airlock. Nothing is written until approved."""
        payload = personal_agent_sync_payload()
        n = len(payload["proposals"])
        whisper = Whisper(
            bubble=Bubble(title=f"Personal AI · {n} updates staged", short_title="Personal AI sync", tone="green", icon="sparkle"),
            caption=[CaptionPart(text=f"{n} updates", source=Source.customer), CaptionPart(text=" staged for your review.")],
        )
        return {"sync_staging": payload, "whisper": whisper.model_dump(mode="json"), "trace": [f"stage_sync:{n}"]}

    def scan(state: AgentState) -> dict:
        cab = Cabinet(**state["cabinet"])
        signals = [{"id": e.id, "label": e.title, "kind": e.kind, "status": e.status.value}
                   for e in cab.live() if e.source == Source.nordea]
        n = len(signals)
        whisper = Whisper(bubble=None, caption=[CaptionPart(text=f"{n} from Nordea", source=Source.nordea),
                                                CaptionPart(text=", all yours to check.")])
        return {"signals": signals, "whisper": whisper.model_dump(mode="json"), "trace": ["scan"]}

    g = StateGraph(AgentState)
    g.add_node("route_intent", route_intent)
    g.add_node("load_context", load_context)
    g.add_node("no_context", no_context)
    g.add_node("hygiene", hygiene_node)
    g.add_node("compute_readiness", compute_readiness)
    g.add_node("compose_whisper", compose_whisper)
    g.add_node("add_context", add_context)
    g.add_node("audit", audit)
    g.add_node("scan", scan)
    g.add_node("rate_menu", rate_menu_node)
    g.add_node("stage_sync", stage_sync)

    g.add_edge(START, "route_intent")
    g.add_edge("route_intent", "load_context")
    g.add_conditional_edges("load_context", after_load,
                            ["no_context", "hygiene", "add_context", "audit", "scan", "rate_menu", "stage_sync"])
    g.add_edge("hygiene", "compute_readiness")
    g.add_edge("compute_readiness", "compose_whisper")
    for n in ("no_context", "compose_whisper", "add_context", "audit", "scan", "rate_menu", "stage_sync"):
        g.add_edge(n, END)

    return g.compile(checkpointer=InMemorySaver() if checkpointer == "memory" else checkpointer)


def turn_input(user_id: str, question: str = "", intent: str | None = None,
               target_entry_id: str | None = None, rephrase: bool = False, menu: list | None = None) -> dict:
    """Input for one turn. Output fields are reset so a checkpointed thread
    never leaks the previous turn's answer."""
    return {
        "user_id": user_id, "question": question, "intent": intent, "target_entry_id": target_entry_id,
        "rephrase": rephrase, "readiness": None, "suggestions": None, "whisper": None, "tip": None,
        "spare": None, "new_entry": None, "xray": None, "signals": None, "trace": None,
        "menu": menu, "menu_rating": None, "sync_staging": None, "anchored": None, "partial": None,
    }

"""Menu rating: which dishes fit Lauri's plan.

The per-dish budget comes from the live flat goal (`lunch_cap`). No goal, no
cap, so everything fits. Context off: the agent can't judge prices at all.
Like readiness, every number here is computed, never written by the LLM.
"""
from __future__ import annotations

from .models import Bubble, Cabinet, CaptionPart, Source, Whisper


def meal_budget(cab: Cabinet) -> dict:
    if not cab.context_on:
        return {"known": False, "cap": None, "goal_id": None}
    goal = next((e for e in cab.live("flat_goal") if e.data.get("lunch_cap")), None)
    if goal is None:
        return {"known": True, "cap": None, "goal_id": None}
    return {"known": True, "cap": float(goal.data["lunch_cap"]), "goal_id": goal.id}


def rate_menu(cab: Cabinet, items: list[dict]) -> dict:
    budget = meal_budget(cab)
    if not budget["known"]:
        return {**budget, "items": [], "over_count": 0}
    cap = budget["cap"]
    rated = []
    for it in items:
        price = float(it["price"])
        over = round(price - cap, 2) if cap is not None and price > cap else 0.0
        rated.append({"id": it["id"], "name": it.get("name"), "price": price, "fits": over == 0.0, "over": over})
    return {**budget, "items": rated, "over_count": sum(1 for r in rated if not r["fits"])}


def _eur(x: float) -> str:
    return f"€{x:.0f}" if float(x).is_integer() else f"€{x:.2f}"


def menu_whisper(rating: dict) -> Whisper:
    if not rating["known"]:
        return Whisper(bubble=Bubble(title="No context", short_title="No context", tone="grey", icon="question", anchor="table"),
                       caption=[CaptionPart(text="No context. I can't judge prices.")])
    if rating["cap"] is None:
        return Whisper(bubble=Bubble(title="Everything fits · No goal to protect", tone="green", icon="check", anchor="table"),
                       caption=[CaptionPart(text="No savings goal to protect. "), CaptionPart(text="Everything fits.", tone="good")])
    n = rating["over_count"]
    noun = "dish is" if n == 1 else "dishes are"
    return Whisper(
        bubble=Bubble(title=f"Lunch budget {_eur(rating['cap'])} · Keeps your flat plan on track", tone="green", icon="fork", anchor="table"),
        caption=[CaptionPart(text=f"{n} {noun}", tone="warn" if n else "good"), CaptionPart(text=" over your "),
                 CaptionPart(text="flat-plan", source=Source.customer), CaptionPart(text=" budget.")],
    )

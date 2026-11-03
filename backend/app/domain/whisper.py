"""Deterministic whispers (bubble + caption) built from readiness facts,
plus the guardrail that checks any LLM-written caption against those facts."""
from __future__ import annotations

import re
from datetime import date

from .models import Bubble, Cabinet, CaptionPart, Entry, Source, Status, Whisper
from .readiness import Readiness

MAX_CAPTION_WORDS = 9


def euro_k(amount: int) -> str:
    return f"€{round(amount / 1000)}k" if amount >= 1000 else f"€{amount}"


def answer_bubble(r: Readiness) -> Bubble:
    if r.on_track:
        return Bubble(title=f"On track · ~{r.months} mo", short_title="On track", tone="green",
                      badge="Loan est. ↓" if r.loan_estimate_reduced else None)
    return Bubble(title=f"Tight · ~{r.months} mo", short_title=f"Tight · ~{r.months} mo", tone="amber",
                  badge="Loan est. ↓" if r.loan_estimate_reduced else None)


def citation_caption(r: Readiness) -> list[CaptionPart]:
    return [
        CaptionPart(text="Your "),
        CaptionPart(text=f"{r.horizon_months}-month plan", source=Source.customer),
        CaptionPart(text=" vs your "),
        CaptionPart(text=f"{euro_k(r.balance)} ASP", source=Source.nordea),
        CaptionPart(text="."),
    ]


def spare_caption(r: Readiness) -> list[CaptionPart]:
    if r.spare > 0:
        unit = "month" if r.spare == 1 else "months"
        return [CaptionPart(text=f"{r.spare} {unit}", tone="good"), CaptionPart(text=" to spare.")]
    return [CaptionPart(text="No margin left.")]


def tip_caption(r: Readiness) -> list[CaptionPart]:
    return [
        CaptionPart(text="Save "),
        CaptionPart(text="the raise", source=Source.nordea),
        CaptionPart(text=" too → "),
        CaptionPart(text=f"~{r.tip_months} months.", tone="good"),
    ]


def answer_whisper(r: Readiness, caption: list[CaptionPart] | None = None) -> Whisper:
    return Whisper(bubble=answer_bubble(r), caption=caption or citation_caption(r))


def no_context_whisper() -> Whisper:
    return Whisper(
        bubble=Bubble(title="Income? Savings?", tone="grey", icon="question"),
        caption=[CaptionPart(text="Enter your details to calculate.")],
    )


def anchored_whisper(a: dict) -> Whisper:
    """The generic answer an agent gives when it only knows the old car goal."""
    return Whisper(
        bubble=Bubble(title=f"{a['title']} · ~{a['months']} mo", tone="amber", icon="clock"),
        caption=[CaptionPart(text=f"At €{a['monthly']}/mo, your "), CaptionPart(text="2023 car goal", source=Source.customer),
                 CaptionPart(text=f" needs ~{a['months']} months.")],
    )


def partial_whisper(p: dict) -> Whisper:
    """A generic answer: true, but it doesn't tell Lauri anything he can act on."""
    saved = f"€{round(p['balance'] / 1000)}k saved" if p.get("balance") else "No savings data"
    horizon = f" in {p['horizon_months']} months" if p.get("horizon_months") else ""
    caption = ([CaptionPart(text=f"€{round(p['balance'] / 1000)}k", source=Source.nordea), CaptionPart(text=" saved for a flat")]
               if p.get("balance") else [CaptionPart(text="Saving for a flat")])
    return Whisper(
        bubble=Bubble(title=f"Keep saving · {saved}, no target yet", tone="blue", icon="home"),
        caption=[*caption, CaptionPart(text=f"{horizon}. Keep going!")],
    )


def no_goal_whisper() -> Whisper:
    return Whisper(
        bubble=Bubble(title="No goal to track", tone="grey", icon="question"),
        caption=[CaptionPart(text="Set a goal to get an answer.")],
    )


def stale_label(e: Entry) -> str:
    year = (e.created or "")[:4]
    return f"{e.title} · idle since {year}" if year else f"{e.title} · idle"


def hygiene(cab: Cabinet) -> list[dict]:
    """Suggest clean-ups: archive stale goals, review signals Nordea is unsure of."""
    out: list[dict] = []
    for e in cab.live():
        if e.source == Source.customer and e.status == Status.stale:
            out.append({"entry_id": e.id, "action": "archive", "label": stale_label(e),
                        "reason": "No money added in 18 months"})
        elif e.source == Source.nordea and e.status == Status.needs_review and e.override_reason is None:
            out.append({"entry_id": e.id, "action": "review", "label": e.title,
                        "reason": "Nordea assumes this is permanent"})
    return out


# ---- guardrail -------------------------------------------------------------
_NUM = re.compile(r"\d[\d,.]*")


def _norm(n: str) -> str:
    return n.replace(",", "").rstrip(".")


def allowed_numbers(r: Readiness) -> set[str]:
    vals = {r.months, r.spare, r.horizon_months, r.tip_months, r.gap, r.balance, r.target_deposit,
            r.flat_monthly, r.monthly_savings, r.tip_monthly, r.balance // 1000, r.gap // 1000,
            r.target_deposit // 1000}
    return {str(v) for v in vals}


def validate_caption(parts: list[CaptionPart], r: Readiness) -> tuple[bool, str]:
    text = "".join(p.text for p in parts).strip()
    if not text:
        return False, "empty"
    if len(text.split()) > MAX_CAPTION_WORDS:
        return False, "too_long"
    bad = [n for n in _NUM.findall(text) if _norm(n) not in allowed_numbers(r)]
    if bad:
        return False, f"unknown_numbers:{','.join(bad)}"
    return True, "ok"


# ---- local title shortener (used when no LLM is configured) ----------------
_STOP = set(
    "i im i'm am is are was be been we we're our my me you your the a an to for of in on at with and or "
    "that this it its next going gonna want wanna will would should planning plan expecting have has had "
    "get getting some about just new really".split()
)


def shorten_title(text: str) -> str:
    words = re.sub(r"[^\w\s'€%+\-]", " ", text, flags=re.UNICODE).split()
    keep = [w for w in words if w.lower() not in _STOP] or words
    pick = keep[:3]
    if not pick:
        return "Note"
    first = pick[0][:1].upper() + pick[0][1:].lower()
    rest = " ".join(w if w[:1].isupper() else w.lower() for w in pick[1:])  # keep names like Espoo
    return f"{first} · {rest}" if rest else first


def today_iso() -> str:
    return date.today().isoformat()

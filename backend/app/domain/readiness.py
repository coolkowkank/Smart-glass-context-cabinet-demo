"""The single readiness function.

Every number the glasses show comes from `readiness()`. The language model
never calculates; it may only rephrase facts this function produced.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field

from .models import Cabinet

# "Save the raise too" assumes this share of salary is saved.
TIP_SAVINGS_RATE = 0.25


def round_half_up(x: float) -> int:
    """Round like a person would (13.5 -> 14), matching JavaScript Math.round."""
    return int(x + 0.5)


@dataclass(frozen=True)
class Readiness:
    known: bool
    missing: list[str] = field(default_factory=list)
    target_deposit: int = 0
    balance: int = 0
    gap: int = 0
    horizon_months: int = 0
    monthly_savings: int = 0
    reserved_share: float = 0.0
    flat_monthly: int = 0
    months: int = 0
    spare: int = 0
    on_track: bool = False
    loan_estimate_reduced: bool = False
    tip_monthly: int = 0
    tip_months: int = 0
    citations: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return asdict(self)


def readiness(cab: Cabinet) -> Readiness:
    if not cab.context_on:
        return Readiness(known=False, missing=["context_off"])

    flat = next(iter(cab.live("flat_goal")), None)
    income = next(iter(cab.live("income")), None)
    savings = next(iter(cab.live("savings")), None)
    missing = [k for k, v in (("flat_goal", flat), ("income", income), ("savings", savings)) if v is None]
    if flat is not None and not flat.data.get("target_deposit"):
        missing.append("deposit_target")  # e.g. a goal typed by hand: "Buy a flat in 18 months"
    if missing:
        return Readiness(known=False, missing=missing)

    target = float(flat.data["target_deposit"])
    horizon = int(flat.data["horizon_months"])
    balance = float(savings.data["balance"])
    salary = float(income.data["monthly"])
    rate = float(income.data["savings_rate"])

    # Other live goals that reserve part of the savings (e.g. the car).
    reserving = [e for e in cab.live() if e.id != flat.id and e.data.get("reserve_share")]
    reserved = min(1.0, sum(float(e.data["reserve_share"]) for e in reserving))
    share = 1.0 - reserved

    gap = max(0.0, target - balance)
    monthly = salary * rate
    flat_monthly = monthly * share
    months = round_half_up(gap / flat_monthly) if flat_monthly > 0 else 999
    spare = horizon - months

    # A spending signal Nordea treats as permanent lowers the loan estimate,
    # unless the customer has overridden it.
    loan_reduced = any(e.override_reason is None for e in cab.live("spending"))

    tip_monthly = salary * TIP_SAVINGS_RATE * share
    tip_months = round_half_up(gap / tip_monthly) if tip_monthly > 0 else 999

    citations = [flat.id, income.id, savings.id, *(e.id for e in reserving), *(e.id for e in cab.live("spending"))]

    return Readiness(
        known=True,
        target_deposit=int(target),
        balance=int(balance),
        gap=int(gap),
        horizon_months=horizon,
        monthly_savings=round_half_up(monthly),
        reserved_share=reserved,
        flat_monthly=round_half_up(flat_monthly),
        months=months,
        spare=spare,
        on_track=spare > 0,
        loan_estimate_reduced=loan_reduced,
        tip_monthly=round_half_up(tip_monthly),
        tip_months=tip_months,
        citations=citations,
    )


def anchored_goal(cab: Cabinet) -> dict | None:
    """What a context-poor agent falls back on when it can't see the flat goal:
    the only savings goal it knows (the stale 2023 car goal). Used to show the
    'before sync' failure: a generic calculator answer about the wrong goal."""
    if not cab.context_on or cab.live("flat_goal"):
        return None
    goal = next((e for e in cab.live() if e.data.get("target_price") and e.data.get("reserve_share")), None)
    income = next(iter(cab.live("income")), None)
    if goal is None or income is None:
        return None
    monthly = float(income.data["monthly"]) * float(income.data["savings_rate"]) * float(goal.data["reserve_share"])
    left = float(goal.data["target_price"]) - float(goal.data.get("saved", 0))
    return {"goal_id": goal.id, "title": goal.title, "target": int(goal.data["target_price"]),
            "monthly": round_half_up(monthly), "months": round_half_up(left / monthly) if monthly > 0 else 999}


def partial_flat(cab: Cabinet) -> dict | None:
    """What the agent can say when the flat goal exists but the Cabinet is thin (after a
    desync and a goal added by hand): only the horizon and whatever Nordea contributed.
    Too little to compute months or check the plan, so the answer stays generic."""
    if not cab.context_on:
        return None
    flat = next(iter(cab.live("flat_goal")), None)
    if flat is None:
        return None
    r = readiness(cab)
    if r.known:
        return None
    savings = next(iter(cab.live("savings")), None)
    return {"goal_id": flat.id, "horizon_months": int(flat.data.get("horizon_months", 0)) or None,
            "balance": int(savings.data["balance"]) if savings else None, "missing": r.missing}

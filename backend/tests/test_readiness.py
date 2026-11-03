import pytest

from app.domain.readiness import readiness
from app.domain.whisper import shorten_title, validate_caption
from app.domain.models import CaptionPart

from .conftest import CASES


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_shared_cases(store, case):
    cab = store.apply_demo_state("lauri", include_baby=False, **case["state"])
    r = readiness(cab).as_dict()
    for key, want in case["expect"].items():
        assert r[key] == want, f"{key}: {r[key]} != {want}"


def test_restore_brings_car_back(store):
    store.archive("lauri", "car")
    store.restore("lauri", "car")
    assert readiness(store.get("lauri")).months == 18
    assert store.get("lauri").get("car").status.value == "stale"


def test_notes_do_not_change_numbers(store):
    before = readiness(store.get("lauri"))
    store.add("lauri", "Baby · autumn", "Expecting a baby next autumn")
    assert readiness(store.get("lauri")) == before


@pytest.mark.parametrize("text,title", [
    ("Expecting a baby next autumn", "Baby · autumn"),
    ("Planning to renovate the kitchen in spring", "Renovate · kitchen spring"),
    ("Bonus", "Bonus"),
    ("We are moving to Espoo in spring", "Moving · Espoo spring"),
])
def test_shorten_title(text, title):
    assert shorten_title(text) == title


def test_guardrail_rejects_invented_numbers(store):
    r = readiness(store.get("lauri"))
    ok, _ = validate_caption([CaptionPart(text="Ready in 12 months.")], r)
    assert not ok
    ok, _ = validate_caption([CaptionPart(text="About 18 months, as planned.")], r)
    assert ok
    ok, why = validate_caption([CaptionPart(text="one two three four five six seven eight nine ten")], r)
    assert not ok and why == "too_long"

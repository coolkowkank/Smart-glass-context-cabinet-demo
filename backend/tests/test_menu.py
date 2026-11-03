"""Restaurant scene: the agent flags dishes against the flat plan's lunch budget."""
from app.agent import build_graph, turn_input
from app.domain.menu import rate_menu
from app.seed import demo_menu

ITEMS = demo_menu()["items"]
OVER = {"sandwich-1", "sandwich-2", "homestead-burger", "harvest-bowl", "casarecce-pasta"}


def test_flags_dishes_over_the_flat_plan_budget(store):
    r = rate_menu(store.get("lauri"), ITEMS)
    assert r["cap"] == 12.0
    assert {i["id"] for i in r["items"] if not i["fits"]} == OVER
    burger = next(i for i in r["items"] if i["id"] == "homestead-burger")
    assert burger["over"] == 2.5
    assert len(r["items"]) == 27


def test_removing_the_flat_goal_turns_everything_green(store):
    store.archive("lauri", "flat")
    r = rate_menu(store.get("lauri"), ITEMS)
    assert r["cap"] is None and r["over_count"] == 0
    assert all(i["fits"] for i in r["items"])


def test_no_context_means_no_judgement(store):
    store.set_context("lauri", False)
    r = rate_menu(store.get("lauri"), ITEMS)
    assert r["known"] is False and r["items"] == []


def test_menu_through_the_graph(store):
    g = build_graph(store)
    out = g.invoke(turn_input("lauri", intent="menu", menu=ITEMS), {"configurable": {"thread_id": "m"}})
    assert out["trace"] == ["route_intent:given", "load_context", "rate_menu:5_over"]
    assert "".join(p["text"] for p in out["whisper"]["caption"]) == "5 dishes are over your flat-plan budget."


def test_menu_api_and_missing_goal_answer(client):
    a = client.post("/api/demo/lauri/state", json={"car_archived": True, "dining_overridden": True, "flat": True}).json()
    assert a["whisper"]["bubble"]["title"] == "On track · ~14 mo"
    m = client.post("/api/agent/lauri/menu", json={}).json()
    assert m["menu_rating"]["over_count"] == 5
    client.post("/api/cabinet/lauri/entries/flat/archive")
    m = client.post("/api/agent/lauri/menu", json={"items": ITEMS}).json()
    assert m["menu_rating"]["over_count"] == 0
    a = client.post("/api/agent/lauri/answer").json()
    assert a["whisper"]["bubble"]["title"] == "No goal to track"  # not "Income? Savings?"

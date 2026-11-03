"""M4–M6: desync empties the Cabinet, a goal typed by hand gives a generic answer,
and a re-sync makes the answer meaningful again."""
from app.agent import build_graph, turn_input
from app.domain.readiness import readiness
from app.seed import manual_context


def answer_text(out):
    return out["whisper"]["bubble"]["title"], "".join(p["text"] for p in out["whisper"]["caption"])


def ask(store, thread):
    g = build_graph(store)
    return g.invoke(turn_input("lauri", question="Am I on track?"), {"configurable": {"thread_id": thread}})


def test_desync_empties_the_cabinet_without_deleting(fresh_store):
    fresh_store.apply_sync("lauri")
    cab = fresh_store.desync("lauri")
    assert cab.entries == [] and {e.id for e in cab.withheld} == {"flat", "car", "salary", "asp", "dining"}
    assert answer_text(ask(fresh_store, "d1"))[0] == "No goal to track"


def test_goal_by_hand_plus_related_nordea_signal_gives_a_generic_answer(fresh_store):
    fresh_store.apply_sync("lauri")
    fresh_store.desync("lauri")
    fresh_store.add_goal("lauri", manual_context()["entry"])
    cab, moved = fresh_store.nordea_contribute("lauri")
    assert [e.id for e in moved] == ["asp"]  # only the signal related to a flat goal
    assert sorted(e.id for e in cab.entries) == ["asp", "flat"]
    r = readiness(cab)
    assert not r.known and set(r.missing) == {"income", "deposit_target"}
    out = ask(fresh_store, "d2")
    assert out["trace"][-1] == "compose_whisper:generic_thin_context"
    assert answer_text(out) == ("Keep saving · €22k saved, no target yet", "€22k saved for a flat in 18 months. Keep going!")


def test_resync_completes_the_hand_typed_goal(fresh_store):
    fresh_store.apply_sync("lauri")
    fresh_store.desync("lauri")
    fresh_store.add_goal("lauri", manual_context()["entry"])
    fresh_store.nordea_contribute("lauri")
    cab = fresh_store.apply_sync("lauri")
    assert cab.withheld == []
    assert sorted(e.id for e in cab.entries) == ["asp", "car", "dining", "flat", "salary"]  # no duplicates
    flat = cab.get("flat")
    assert flat.data["target_deposit"] == 32000 and flat.synced_via == "personal_ai"
    assert answer_text(ask(fresh_store, "d3"))[0] == "On track · ~14 mo"


def test_desync_api_flow(client):
    client.post("/api/demo/lauri/state", json={"synced": True})
    a = client.post("/api/cabinet/lauri/desync").json()
    assert a["cabinet"]["entries"] == [] and a["whisper"]["bubble"]["title"] == "No goal to track"
    a = client.post("/api/cabinet/lauri/goals").json()
    assert [e["id"] for e in a["cabinet"]["entries"]] == ["flat"]
    a = client.post("/api/cabinet/lauri/nordea/contribute").json()
    assert [e["id"] for e in a["contributed"]] == ["asp"]
    assert a["whisper"]["bubble"]["title"].startswith("Keep saving")
    assert a["partial"]["goal_id"] == "flat"  # the UI tethers the goal and the ASP to the core
    a = client.post("/api/cabinet/lauri/sync/apply", json={}).json()
    assert a["whisper"]["bubble"]["title"] == "On track · ~14 mo"


def test_demo_states_for_the_desync_moments(client):
    a = client.post("/api/demo/lauri/state", json={"synced": True, "desynced": True}).json()
    assert a["cabinet"]["entries"] == []
    a = client.post("/api/demo/lauri/state", json={"synced": True, "desynced": True, "manual_flat": True}).json()
    assert sorted(e["id"] for e in a["cabinet"]["entries"]) == ["asp", "flat"]

"""Personal AI sync: proposals are staged in an airlock and only approved ones are written."""
import pytest

from app.agent import build_graph, turn_input
from app.domain.readiness import readiness
from app.seed import personal_agent_sync_payload


def test_payload_has_proposals_and_safeguards():
    p = personal_agent_sync_payload()
    assert [x["id"] for x in p["proposals"]] == ["sync-flat", "sync-car-stale", "sync-dining-override", "sync-salary-ack"]
    assert {f["category"] for f in p["filtered_out"]} == {"Hallucination guardrail", "Advisory enclave firewall"}
    assert p["reality_checks"][0]["after_days"] == 60


def test_staging_writes_nothing(store):
    before = store.get("lauri")
    g = build_graph(store)
    out = g.invoke(turn_input("lauri", intent="sync"), {"configurable": {"thread_id": "s"}})
    assert out["trace"] == ["route_intent:given", "load_context", "stage_sync:4"]
    assert len(out["sync_staging"]["proposals"]) == 4
    assert store.get("lauri") == before


def test_default_sync_reconciles_the_cabinet(store):
    cab = store.apply_sync("lauri")
    assert cab.get("car").status.value == "archived"
    assert cab.get("dining").override_reason == "Temporary: Q3 busy work sprint"
    assert {e.id for e in cab.entries if e.synced_via == "personal_ai"} == {"flat", "car", "dining", "salary"}
    r = readiness(cab)
    assert (r.months, r.on_track, r.loan_estimate_reduced, r.tip_months) == (14, True, False, 10)


def test_only_approved_proposals_are_written(store):
    cab = store.apply_sync("lauri", ["sync-dining-override"])
    assert cab.get("car").status.value == "stale"  # unticked: left alone
    assert cab.get("car").synced_via is None
    assert cab.get("dining").synced_via == "personal_ai"
    assert readiness(cab).months == 18


def test_unknown_proposal_is_rejected(store):
    with pytest.raises(ValueError):
        store.apply_sync("lauri", ["sync-vineyard"])


def test_sync_api_round_trip(client):
    s = client.post("/api/agent/lauri/sync/stage").json()
    assert s["sync_staging"]["agent_name"] == "Lauri's Personal AI"
    assert s["whisper"]["bubble"]["title"] == "Personal AI · 4 updates staged"
    a = client.post("/api/cabinet/lauri/sync/apply", json={"approved_ids": ["sync-car-stale", "sync-dining-override"]}).json()
    assert a["whisper"]["bubble"]["title"] == "On track · ~14 mo" and a["whisper"]["bubble"]["badge"] is None
    assert client.post("/api/cabinet/lauri/sync/apply", json={"approved_ids": ["nope"]}).status_code == 422
    r = client.post("/api/agent/lauri/ask", json={"question": "Sync with my personal AI"}).json()
    assert r["intent"] == "sync"


def test_demo_state_synced(client):
    a = client.post("/api/demo/lauri/state", json={"synced": True}).json()
    flat = next(e for e in a["cabinet"]["entries"] if e["id"] == "flat")
    assert flat["synced_via"] == "personal_ai" and a["readiness"]["months"] == 14


def test_first_answer_anchors_on_the_old_car_goal(fresh_store):
    """Before sync the Cabinet has no flat goal, so 'Am I on track?' gets a generic car answer."""
    g = build_graph(fresh_store)
    out = g.invoke(turn_input("lauri", question="Am I on track?"), {"configurable": {"thread_id": "a"}})
    assert out["trace"][-1] == "compose_whisper:anchored_on_old_goal"
    assert out["whisper"]["bubble"]["title"] == "Car goal · ~82 mo"
    assert "".join(p["text"] for p in out["whisper"]["caption"]) == "At €182/mo, your 2023 car goal needs ~82 months."
    assert out["anchored"] == {"goal_id": "car", "title": "Car goal", "target": 15000, "monthly": 182, "months": 82}


def test_sync_creates_the_flat_goal_from_the_personal_ai(fresh_store):
    assert fresh_store.get("lauri").get("flat") is None
    cab = fresh_store.apply_sync("lauri")
    flat = cab.get("flat")
    assert flat.synced_via == "personal_ai" and flat.data["target_deposit"] == 32000
    assert readiness(cab).months == 14


def test_proposals_are_short_and_cite_sources():
    for p in personal_agent_sync_payload()["proposals"]:
        assert len(p["summary"].split()) <= 12 and len(p["impact"].split()) <= 10
        assert p["why"]["reason"] and len(p["why"]["cited"]) >= 2

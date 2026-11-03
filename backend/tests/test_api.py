def test_health(client):
    assert client.get("/api/health").json()["ok"] is True


def test_demo_walkthrough(client):
    """The storyboard, end to end over HTTP."""
    # M2: context off
    a = client.post("/api/demo/lauri/state", json={"context_on": False, "flat": True}).json()
    assert a["whisper"]["bubble"]["title"] == "Income? Savings?"
    # M3: first answer
    a = client.post("/api/demo/lauri/state", json={"context_on": True, "flat": True}).json()
    assert a["whisper"]["bubble"]["title"] == "Tight · ~18 mo"
    # M4: archive the stale car goal
    client.post("/api/cabinet/lauri/entries/car/archive")
    a = client.post("/api/agent/lauri/answer").json()
    assert a["whisper"]["bubble"]["title"] == "On track · ~14 mo"
    # M5: audit, then correct dining
    x = client.post("/api/agent/lauri/audit/dining").json()
    assert len(x["xray"]) == 3
    client.post("/api/cabinet/lauri/entries/dining/override", json={"reason": "Kitchen renovation / hosting"})
    a = client.post("/api/agent/lauri/answer").json()
    assert a["whisper"]["bubble"]["badge"] is None
    # M6: quick add
    n = client.post("/api/agent/lauri/add", json={"text": "Expecting a baby next autumn"}).json()
    assert n["new_entry"]["title"] == "Baby · autumn"
    # M7: scan
    s = client.post("/api/agent/lauri/scan").json()
    assert len(s["signals"]) == 3
    # M8: takeaway
    a = client.post("/api/agent/lauri/answer").json()
    assert a["whisper"]["bubble"]["short_title"] == "On track"
    assert a["tip"][-1]["text"] == "~10 months."


def test_unknown_user_and_entry(client):
    assert client.get("/api/cabinet/nobody").status_code == 404
    assert client.post("/api/cabinet/lauri/entries/nope/archive").status_code == 404


def test_stream(client):
    with client.stream("POST", "/api/agent/lauri/ask/stream", json={"question": "Am I on track?"}) as r:
        body = "".join(r.iter_text())
    assert '"node": "compute_readiness"' in body
    assert body.strip().endswith("data: {}")


def test_free_question_routes(client):
    a = client.post("/api/agent/lauri/ask", json={"question": "Why is dining flagged?"}).json()
    assert a["intent"] == "audit"

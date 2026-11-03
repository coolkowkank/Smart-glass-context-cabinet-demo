"""Graph tests: deterministic mode plus a fake LLM to exercise the guardrail."""
from app.agent import build_graph, turn_input
from app.agent.graph import CaptionOut, IntentOut, TitleOut, rule_intent
from app.domain.models import CaptionPart, Source

CFG = {"configurable": {"thread_id": "t1"}}


def run(graph, **kw):
    return graph.invoke(turn_input("lauri", **kw), CFG)


def test_readiness_path(store):
    g = build_graph(store)
    out = run(g, question="Am I on track to buy this flat?")
    assert out["intent"] == "readiness"
    assert out["whisper"]["bubble"]["title"] == "Tight · ~18 mo"
    assert out["whisper"]["bubble"]["badge"] == "Loan est. ↓"
    assert [p["text"] for p in out["whisper"]["caption"]] == ["Your ", "18-month plan", " vs your ", "€22k ASP", "."]
    assert out["suggestions"][0]["label"] == "Car goal · idle since 2023"
    assert out["trace"] == ["route_intent:rules", "load_context", "hygiene", "compute_readiness", "compose_whisper:template"]


def test_answer_improves_as_cabinet_is_cleaned(store):
    g = build_graph(store)
    store.archive("lauri", "car")
    out = run(g, intent="readiness")
    assert out["whisper"]["bubble"]["title"] == "On track · ~14 mo"
    assert out["spare"][0]["text"] == "4 months"
    store.override("lauri", "dining", "Kitchen renovation / hosting")
    out = run(g, intent="readiness")
    assert out["whisper"]["bubble"]["badge"] is None
    assert out["tip"][-1]["text"] == "~10 months."


def test_context_off(store):
    g = build_graph(store)
    store.set_context("lauri", False)
    out = run(g, question="Am I on track?")
    assert out["whisper"]["bubble"]["tone"] == "grey"
    assert out["trace"][-1] == "no_context"


def test_add_context_and_trace_resets(store):
    g = build_graph(store)
    run(g, question="Am I on track?")
    out = run(g, question="Expecting a baby next autumn", intent="add_context")
    assert out["new_entry"]["title"] == "Baby · autumn"
    assert out["trace"] == ["route_intent:given", "load_context", "add_context:local"]
    assert out["readiness"] is None  # previous turn's answer did not leak
    assert out["turns"] == ["Am I on track?", "Expecting a baby next autumn"]  # memory kept


def test_audit_and_scan(store):
    g = build_graph(store)
    out = run(g, intent="audit", target_entry_id="dining")
    assert out["xray"][2][1]["text"] == "Wrong for you."
    out = run(g, intent="scan")
    assert [s["label"] for s in out["signals"]] == ["Salary +12%", "ASP €22k", "Dining +45%"]


def test_rule_intent():
    assert rule_intent("Why does Nordea think I eat out?") == "audit"
    assert rule_intent("We are moving in spring") == "add_context"
    assert rule_intent("Can I afford it?") == "readiness"


# ---- fake LLM ----------------------------------------------------------------
class FakeLLM:
    def __init__(self, caption_text):
        self.caption_text = caption_text

    def with_structured_output(self, schema):
        llm = self

        class Runner:
            def invoke(self, _messages):
                if schema is IntentOut:
                    return IntentOut(intent="readiness")
                if schema is TitleOut:
                    return TitleOut(title="Move · spring")
                return CaptionOut(parts=[CaptionPart(text=llm.caption_text, source=Source.nordea)])

        return Runner()


def test_llm_caption_accepted_when_facts_match(store):
    g = build_graph(store, llm=FakeLLM("18 months: tight, but doable."))
    out = run(g, question="How am I doing?", rephrase=True)
    assert out["trace"][0] == "route_intent:llm"
    assert out["trace"][-1] == "compose_whisper:llm"
    assert out["whisper"]["caption"][0]["text"] == "18 months: tight, but doable."


def test_llm_caption_rejected_when_numbers_invented(store):
    g = build_graph(store, llm=FakeLLM("Ready in 9 months!"))
    out = run(g, question="How am I doing?", rephrase=True)
    assert out["trace"][-1].startswith("compose_whisper:guardrail_rejected")
    assert out["whisper"]["caption"][1]["text"] == "18-month plan"


def test_llm_title(store):
    g = build_graph(store, llm=FakeLLM(""))
    out = run(g, question="We're moving in spring", intent="add_context")
    assert out["new_entry"]["title"] == "Move · spring"

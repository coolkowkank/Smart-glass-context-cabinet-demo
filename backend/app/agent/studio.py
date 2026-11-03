"""Entry point for LangGraph Studio / `langgraph dev` (run from backend/).

Try an input like {"user_id": "lauri", "question": "Am I on track to buy this flat?"}
Studio loads this file directly, so imports are absolute.
"""
from app.agent.graph import build_graph
from app.agent.llm import get_llm
from app.store import InMemoryCabinetStore

graph = build_graph(InMemoryCabinetStore(), get_llm(), checkpointer=None)

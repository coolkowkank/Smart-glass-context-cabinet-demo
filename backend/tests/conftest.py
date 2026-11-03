import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.store import InMemoryCabinetStore

CASES = json.loads((Path(__file__).resolve().parents[2] / "shared" / "readiness_cases.json").read_text())["cases"]


@pytest.fixture
def fresh_store():
    """Lauri's Cabinet before any sync: no flat goal yet (it only lives in his Personal AI)."""
    return InMemoryCabinetStore()


@pytest.fixture
def store(fresh_store):
    """Lauri's Cabinet once the flat goal card has been approved. Most tests start here."""
    fresh_store.apply_sync("lauri", ["sync-flat"])
    return fresh_store


@pytest.fixture
def client(store):
    return TestClient(create_app(store=store, llm=None))

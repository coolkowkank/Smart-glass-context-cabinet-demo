"""Pluggable chat model.

LLM_PROVIDER = none (default) | anthropic | openai | google
LLM_MODEL    = model name (required for openai and google)

With `none`, the agent runs fully deterministic: rule-based routing,
template captions and a local title shortener. Tests and CI use this mode.
"""
from __future__ import annotations

import os

PROVIDERS: dict[str, tuple[str, str | None]] = {
    "anthropic": ("anthropic", "claude-haiku-5-5"),
    "openai": ("openai", None),
    "google": ("google_genai", None),
}


def provider_name() -> str:
    return (os.getenv("LLM_PROVIDER") or "none").strip().lower()


def get_llm():
    name = provider_name()
    if name == "none":
        return None
    if name not in PROVIDERS:
        raise ValueError(f"Unknown LLM_PROVIDER '{name}'. Use one of: none, {', '.join(PROVIDERS)}")
    model_provider, default_model = PROVIDERS[name]
    model = os.getenv("LLM_MODEL") or default_model
    if not model:
        raise ValueError(f"Set LLM_MODEL when LLM_PROVIDER={name}")
    from langchain.chat_models import init_chat_model  # imported lazily so `none` needs no provider package

    return init_chat_model(model, model_provider=model_provider)

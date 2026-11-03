# Uses backend/.venv if it exists, otherwise the system python (e.g. in Codespaces).
PY := $(shell test -x backend/.venv/bin/python && echo .venv/bin/python || echo python3)

.PHONY: install api web dev test studio docker

install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
	cd frontend && npm ci --no-audit --no-fund

api:
	cd backend && $(PY) -m uvicorn app.main:app --reload --port 8000

web:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 api web

test:
	cd backend && $(PY) -m pytest -v
	cd frontend && npm test

studio:
	cd backend && $(PY) -m pip install -q "langgraph-cli[inmem]" && $(PY) -c "import sys; from langgraph_cli.cli import cli; sys.argv=['langgraph','dev']; cli()"

docker:
	docker compose up --build

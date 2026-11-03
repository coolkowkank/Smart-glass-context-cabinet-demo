# Build from the repo root:  docker build -f backend/Dockerfile .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY backend/requirements.txt backend/requirements-llm.txt backend/
ARG WITH_LLM=1
RUN pip install --no-cache-dir -r backend/requirements.txt \
 && if [ "$WITH_LLM" = "1" ]; then pip install --no-cache-dir -r backend/requirements-llm.txt; fi

COPY shared ./shared
COPY backend ./backend
WORKDIR /app/backend

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

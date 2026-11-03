# Running the three-window demo

One computer, one dev server, three browser windows. Everything is staged:
scripted lines, fictional data, no real backend required.

## Start

```sh
cd frontend
npm install
npm run dev
```

Vite serves on http://localhost:5173. Open three windows/tabs on that origin:

| Window | URL | Shows |
| --- | --- | --- |
| 1 - Smart glasses | http://localhost:5173/ | Lauri's view: the scene, the agent's answer bubble, subtitles |
| 2 - Context Cabinet | http://localhost:5173/cabinet.html | The Cabinet as context cards; cards the agent used are highlighted |
| 3 - Main-app chat | http://localhost:5173/chat.html | The same conversation as chat messages, word for word (batch 2) |

Keep all three on the same origin and port - the windows stay in sync over
a BroadcastChannel, no server or network needed.

## Play the story

- Drive the story from window 1 (step through the moments); window 2 in
  follow mode and window 3 follow along at the same moment.
- Window 2 standalone: use its own stepper (or `/cabinet.html?m=N` to open
  at moment N+1); toggle follow mode to mirror window 1.
- Window 1 audio (speech in/out) is optional and browser-dependent; the
  demo works with it off.

## Data and backend

- Default: the offline in-browser agent (same seed, same rules as the
  backend). No setup needed.
- Optional: the FastAPI backend (`docker compose up` or `uvicorn`) is used
  automatically when reachable; the demo does not require it.
- `npm run build:single` packages window 1 only (offline single file).
- Tests: `cd frontend && npx vitest run`.

All customer data is fictional. Nordea is a plain-text wordmark only.

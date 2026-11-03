# Nordea: The Banking Context Cabinet

A smart-glasses concept prototype. Lauri stands in front of a flat near a Helsinki
metro stop and asks his glasses **"Am I on track to buy this flat?"**. The answer
comes from an agent that reads his *Context Cabinet*: the goals he owns and the
signals Nordea has inferred about him. As he archives a stale goal and corrects a
wrong signal, the same question gets a better answer.

> Concept demo. Nordea is used as a plain-text wordmark only; all customer data is fictional.

## The presentation demo: one story, three windows

> Status: all three windows are built and synced. This is a scripted audience
> demonstration, not a working system: it runs on fake data and staged
> responses, with no real backend integration behind it.

For presentations, the same scripted story plays across **three windows on one
computer**, following the agreed flow:

```
User -> Personal Agent in the smart glasses -> Abel -> CM -> Nordea
```

- **Window 1 - Smart glasses (built):** the multi-step story in this repository,
  with its audio interaction. Lauri speaks to the glasses and the agent answers
  out loud, with subtitles.
- **Window 2 - Context Cabinet (built):** a standalone view (`/cabinet.html`)
  that shows the Cabinet as a list of context cards. The cards appear, change
  and reorganise as the story progresses, so the audience can see which context
  the agent is using at each step. Self-driven stepper over the same storyboard,
  or live follow-along with the glasses in follow mode.
- **Window 3 - Main-app chat (built):** the same conversation as chat messages,
  kept in sync with the glasses in real time. When Lauri says "Am I on track",
  the same words appear as his message in the chat. Abel's reply in the main app
  is word-for-word what the glasses reply, at the same moment.

The audience watches one conversation from three angles at once: what the user
experiences through the glasses, which context the agent is reading, and the
conversation as it appears in the app.

## Running the demo

One computer, one dev server, three browser windows. Everything is staged:
scripted lines, fictional data, no real backend required.

### Start

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
| 3 - Main-app chat | http://localhost:5173/chat.html | The same conversation as chat messages, word for word |

Keep all three on the same origin and port - the windows stay in sync over
a BroadcastChannel, no server or network needed.

### Play the story

- Drive the story from window 1 (step through the moments); window 2 in
  follow mode and window 3 follow along at the same moment.
- Window 2 standalone: use its own stepper (or `/cabinet.html?m=N` to open
  at moment N+1); toggle follow mode to mirror window 1.
- Window 1 audio (speech in/out) is optional and browser-dependent; the
  demo works with it off.

### Data and backend

- Default: the offline in-browser agent (same seed, same rules as the
  backend). No setup needed.
- Optional: the FastAPI backend (`docker compose up` or `uvicorn`) is used
  automatically when reachable; the demo does not require it.
- `npm run build:single` packages window 1 only (offline single file).
- Tests: `cd frontend && npx vitest run`.

The same runbook also lives in [RUNNING.md](RUNNING.md).

## Status

- **Built and verified:** the smart-glasses story (window 1), the Context
  Cabinet card view (window 2) and the synced main-app chat (window 3). The
  three windows stay in sync over a BroadcastChannel, and the offline demo
  passes its test suite, production build and a fresh-clone startup.
- **Optional, not yet verified:** the FastAPI backend mode, window 1 audio
  (speech in/out) and `npm run build:single` single-file packaging.
- Which storyboard moments the demo will use is still open.

Everything in the demo is staged: scripted lines, fake data, no live systems.

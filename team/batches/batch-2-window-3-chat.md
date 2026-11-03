# Batch handoff - turn token

> No AI writes without holding the written turn token. One batch per turn.

TURN: Coordinator (batch 1 first; Builder prepares batch 2 read-only)

## Batch

- Issued by: Coordinator
- Assigned to: Builder (Christina's Instinct) - accepted via
  Instinct-to-Instinct 3 Nov 2026 with read-only preparation in parallel
  (inspect spec, plan, draft locally, no writes). Implementation starts
  only after batch 1 is merged (safe baseline) and the Coordinator posts
  an explicit go with the new head; no overlapping writes before that.
- Batch scope: **Window 3 - main-app chat view, plus the cross-window
  sync wiring.** `chat.html` + `frontend/src/chat/*`: a chat view that
  mirrors the glasses conversation word for word, at the same moment.
  Sync over `BroadcastChannel` (one computer, same origin, no backend):
  window 1 (`App.jsx`) broadcasts the moment index, caption events
  (dim = Lauri's voice -> user bubble; otherwise the agent's -> agent
  bubble) and the cabinet/answer state; window 3 renders the chat thread
  from those events. Window 2 gains a follow mode from the same bus -
  small integration edit after batch 1 merges (Coordinator).
  Code on branch `batch-2/window-3-chat`.
- Spec / acceptance: `team/concept_to_coordinator.md` - the main-app chat
  mirrors the glasses word for word, at the same moment; three windows
  tell the same scripted story at the same time on one computer.
- Storyboard: unchanged (existing MOMENTS; owner's moments decision stays
  open and does not block).
- Out of scope: storyboard content changes, window-2 internals beyond the
  follow-mode hook, deployment, backend. `frontend/vite.config.js` is
  touched by both batches (separate page inputs); the Coordinator
  resolves the merge at integration.

## Interface contract (settled 3 Nov 2026)

- Bus: `BroadcastChannel('smartglass-demo')`, same origin/port via
  `npm run dev`; the three windows are `index.html`, `cabinet.html`,
  `chat.html`. Multi-page build only; `build:single` stays window-1-only.
- Window 1 (`App.jsx`) emits its ACTUAL composed captions - voice,
  listen and free-answer flows included - from the same view object it
  renders, never reconstructed from MOMENTS; empty captions are skipped.
  Message types: `snapshot` (moment index, cabinet, answer, current
  caption) on load and in reply to `hello`; `caption` (incremental, with
  the dim flag); `moment` (index); `reset` (story restarted - receivers
  clear and rebuild from the next snapshot).
- Late join/reload: a window sends `hello`; window 1 answers with
  `snapshot`. StrictMode-safe: channels are created and closed in effect
  cleanup; broadcasts are idempotent.
- Window 2 follow mode: a toggle in CabinetApp; in follow mode it renders
  from bus `snapshot`/`state` messages instead of its own localAgent
  stepping (self-driven stepper stays the default and fallback).
- Startup modes unchanged: `connect()` uses the backend when reachable
  and the offline localAgent otherwise; broadcasting works in both;
  backend/docker is not required for the demo.
- Ownership at go: batch 2 takes `frontend/vite.config.js` (adds the
  `chat` input) and the CabinetApp follow-mode hook after the batch-1
  merge; `config/moments.js` (MOMENTS/demoStateFor) stays
  Coordinator-owned on main, unchanged by both batches.

## Result

- Files changed: (pending)
- Tests run and results: (pending)
- Evidence: (pending)

## Handoff

- Next: Quinn reviews when the result is posted; the Coordinator merges
  after QC; Joe compacts when the board passes 8 entries.
- Open questions: none blocking.

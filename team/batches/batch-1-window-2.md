# Batch handoff - turn token

> No AI writes without holding the written turn token. One batch per turn.

TURN: Coordinator (implementing)

## Batch

- Issued by: Coordinator
- Assigned to: Coordinator (Telkomsel). The Builder accepted a bounded
  transfer via Instinct-to-Instinct 3 Nov 2026 and her Git route was
  verified (push permission), but the Coordinator retained implementation
  to avoid handoff churn: no code ever changed hands and the branch head
  never moved from `d1cb17c9`.
- Design notes: reuse `connect()`/localAgent (offline); per step call
  `demoState(UID, demoStateFor(i))` which returns the answer shape with
  `cabinet` and `readiness.citations` (entry ids the agent used -
  highlight those cards); palette `C` from `config/moments.js`; entry
  shape in `shared/lauri.json` (id, source, status, kind, title, detail,
  data).
- Scope amendment (Coordinator, 3 Nov 2026): window 2 is self-driven - its
  own stepper walks the storyboard moments (demoState per step), so it
  runs standalone. Live follow-along with window 1 (cross-window sync
  wiring) is part of the window-3 batch, not this one, keeping the two
  batches on disjoint files.
- Batch scope: **Window 2 - Context Cabinet card view.** A standalone
  staged view in this repository that shows the Cabinet as context cards
  that appear, change and reorganise in step with the window-1 story
  (`frontend/src/config/moments.js` stays the single source of story steps
  and per-moment Cabinet state). Runs on one computer alongside window 1
  (own route/port). Scripted fake data only, visibly fictional, no backend.
  Code lives on branch `batch-1/window-2-context-cabinet`.
- Spec / acceptance: `team/concept_to_coordinator.md` (Goals, Acceptance
  criteria) and README window 2: the audience can see which context cards
  the agent is using at each story step; nothing implies a real backend or
  real data.
- Storyboard: provisional, reversible choice - use the existing MOMENTS
  as-is (the owner's storyboard-moments decision stays open and does not
  block this batch).
- Out of scope: window 3, real-time sync transport, storyboard content
  changes, merges to main, deployment/GitHub Pages, spending, security or
  access changes.
- Write authority: pushes to `batch-1/window-2-context-cabinet` only. No
  writes to `main` outside the Coordinator's own team files.

## Result

- Files changed: `frontend/cabinet.html`,
  `frontend/src/cabinet/{main.jsx,CabinetApp.jsx,cabinet.css,model.js,model.test.js}`,
  `frontend/vite.config.js` (multi-page input: `main` + `cabinet`),
  `README.md` (window 2 status).
- Tests run and results: `vitest run` 41/41 pass (5 new cabinet model
  tests); `vite build` passes and emits both pages.
- Evidence: Coordinator visual check (headless Chrome against
  `vite preview`): M1 shows the wrong car-goal answer with the four
  starter cards; M3 shows "On track - ~14 mo" with Flat goal, Salary,
  ASP and Dining pulled into "Used in this answer" (cyan highlight) and
  the car goal in Archived; M5 shows the empty start state before
  add-by-hand; window 1 regression screenshot unchanged.
- Known limitation: the stepper shows each moment's START state;
  intra-moment interactions (add, sync) arrive with the batch-2 follow
  mode. Deep-link: `/cabinet.html?m=N`.

## Handoff

- Next: Builder (on acceptance) or Coordinator; Quinn reviews the batch
  result when posted; Joe compacts records when the board passes 8 open +
  reply entries.
- Open questions: none blocking. Window 3 sync transport is a later batch
  decision.

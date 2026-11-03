# Batch handoff - turn token

> No AI writes without holding the written turn token. One batch per turn.

TURN: Coordinator (provisional build) - transfers to Builder on acceptance

## Batch

- Issued by: Coordinator
- Assigned to: Builder (Christina's Instinct) - acceptance requested via
  Instinct-to-Instinct; the Coordinator executes provisionally on the
  branch until the Builder accepts, then hands over at the branch head.
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

- Files changed: (pending)
- Tests run and results: (pending)
- Evidence: (pending)

## Handoff

- Next: Builder (on acceptance) or Coordinator; Quinn reviews the batch
  result when posted; Joe compacts records when the board passes 8 open +
  reply entries.
- Open questions: none blocking. Window 3 sync transport is a later batch
  decision.

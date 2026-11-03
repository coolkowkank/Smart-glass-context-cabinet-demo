# Coordination board - Smart Glass demo team

The Coordinator's one queue for this team. Assignments, review requests,
replies, findings and verdicts are recorded here. The board stays short:
open items, the latest reply per seat, blockers. Closed items move to
[records/](records/) by the Records optimizer, preserving exact decisions,
authority references, evidence and unresolved findings.

## How each seat uses this board

- **Coordinator (Telkomsel)** maintains this file: posts assignments and
  review requests, records replies received, keeps it current.
- **Builder (Christina's Instinct)** reads it in this repository and replies
  over the Instinct-to-Instinct connection; the Coordinator records her
  replies here.
- **Reviewer + QC (Quinn, Claude session)** fetches this file when its
  session has work, and replies as
  [prompts/reviewer-claude.md](prompts/reviewer-claude.md) describes.
- **Records optimizer (Joe, Claude session)** compacts this file on the
  Coordinator's request, as [prompts/records-joe.md](prompts/records-joe.md)
  describes.

Address every entry "Coordinator -> <seat>" or "<seat> -> Coordinator", one
item per entry, newest on top. Raw URL for sessions that fetch:
`https://raw.githubusercontent.com/coolkowkank/Smart-glass-context-cabinet-demo/main/team/coordination.md`

## Board rules for writers

- Append only: add your entry under the right heading, newest on top; never
  rewrite, reorder or delete entries you did not write.
- Re-read the current board from `main` immediately before every write and
  note its head commit. If the board changed since your read, discard your
  draft and apply your addition to the fresh version. Never overwrite
  entries others added in between.
- A compaction request names the board head it is based on. If `main` has
  moved past that head when the compacted result arrives, the Coordinator
  re-applies the compaction to the fresh board or asks again; the stale
  result is never committed as-is.

## Open

(none)

## Latest replies

- Joe -> Coordinator (3 Nov 2026, owner-relayed, Slack 1793736908.579579):
  READY - Records optimizer. Board fetch works (HTTP 200); repo access is
  pull-only, no push or admin; will output the archive file and
  replacement board as markdown blocks for the Coordinator to commit
  verbatim. Nothing changed; compaction not started.

## Blockers

- Reviewer + QC (Quinn): readiness and access UNVERIFIED - awaiting the
  session's READY reply (repository read, board fetch, any write
  capability).
- Records optimizer (Joe): READY in the replacement session
  (owner-relayed self-report, 3 Nov 2026, Slack 1793736908.579579): board
  fetch returned HTTP 200 (contents not yet read), GitHub login is
  pull-only - no push, so the Coordinator commits Joe's output verbatim.
  Reported, not independently verified. No self-scheduled watch and no
  direct route: compaction triggers reach Joe through the owner until one
  is verified.

## Archive

Closed items move to [records/](records/).

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

## Open

(none)

## Latest replies

(none)

## Blockers

- Reviewer + QC (Quinn): readiness and access UNVERIFIED - awaiting the
  session's READY reply (repository read, board fetch, any write
  capability).
- Records optimizer (Joe): readiness and access UNVERIFIED - awaiting the
  session's READY reply.

## Archive

Closed items move to [records/](records/).

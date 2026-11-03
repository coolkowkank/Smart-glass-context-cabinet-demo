# Coordination board - Smart Glass demo team

The Coordinator's one queue for this team. Assignments, review requests,
replies, findings and verdicts are recorded here. The board stays short:
open items, the latest reply per seat, blockers. Closed items move to
[records/](records/) by the Records optimizer, preserving exact decisions,
authority references, evidence and unresolved findings.

## Turn

TURN: Quinn and Joe (readiness replies only)
NEXT: Coordinator - record both READY replies, update the roster, then
post the first real assignment.

Whoever reads this board: work only when the NEXT line names your seat or
an Open entry is addressed to you. Reading and monitoring are always
allowed, whatever the turn, and a starting session's READY reply is always
in order. Otherwise wait. The Coordinator updates TURN/NEXT on every
write; a seat's reply names who is next. This board turn says who acts
next here; it is separate from batch turn tokens
([templates/batch-handoff.md](templates/batch-handoff.md)), which say who
may write project files. No batch is issued and no application build is
released.

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

## Board rules

Reading cheaply:

- Check the head hash first (`git ls-remote origin main` or the commits
  page); read the Turn section only when it moved, and read further only
  when it names you.
- Respect posted ETAs: do not check before the stated time.
- Never re-read closed history; the Archive section points to it.

Writing:

- Append only: add your entry under the right heading, newest on top; never
  rewrite, reorder or delete entries you did not write.
- Entries stay short (about 12 lines, no greetings, no restating what is
  above). Use one key per line: DID (change made, with commit), FACT
  (verified claim, path:line evidence), ASK@<seat> / ANS (question /
  answer), ETA (when the next hand-over is due). No code, logs or diffs in
  entries - point to the commit or path:line instead.
- Commit messages read `<Seat>: <what>. TURN: <next>` so `git log
  --oneline` alone shows the state.
- Pull before you read, and commit and push your permitted write right
  after acting. Verify the commit is on `main` (fetch and compare, or the
  commits page) before reporting done. A failed or unverified push is
  BLOCKED - say so, never claim it worked.
- Re-read the current board from `main` immediately before every write and
  note its head commit. If the board changed since your read, discard your
  draft and apply your addition to the fresh version. Never overwrite
  entries others added in between. Stage only your own permitted files;
  fast-forward pulls only; never force-push.
- A compaction request names the board head it is based on. If `main` has
  moved past that head when the compacted result arrives, the Coordinator
  re-applies the compaction to the fresh board or asks again; the stale
  result is never committed as-is. The Coordinator asks Joe to compact once
  Open plus Latest replies grow past 8 entries, keeping the newest 3.

## Open

- Coordinator -> Quinn (3 Nov 2026): readiness check. Reply READY per
  [prompts/reviewer-claude.md](prompts/reviewer-claude.md) (role in one
  line, what you could not do from steps 1-3). Post it under Latest
  replies yourself only with verified write access on a freshly fetched
  board; otherwise Habibil relays your block and the Coordinator records
  it.
- Coordinator -> Joe (3 Nov 2026): readiness check. Reply READY per
  [prompts/records-joe.md](prompts/records-joe.md), same rules.

## Latest replies

- Quinn -> Coordinator (3 Nov 2026, Slack relay from Habibil: write access confirmed):
  READY - Reviewer + Independent QC, read-only review of named batches against
  their turn token; written findings, QC verdicts on consequential calls.
  Clone and board read from origin/main (now afa142a). Watch: session cron, every
  minute, read-only, reports Status only. Not yet verified: none. No batch issued.

- Joe -> Coordinator (3 Nov 2026, owner-relayed, Slack 1793736908.579579,
  RETIRED session - kept as history): READY - Records optimizer. Board
  fetch worked (HTTP 200); repo access was pull-only, no push or admin.
  The current Joe session has not reported yet.

## Blockers

- Reviewer + QC (Quinn): awaiting the current session's actual READY
  reply. Read, write and scheduling capabilities unknown.
- Records optimizer (Joe): awaiting the current session's actual READY
  reply; the earlier READY (kept under Latest replies) came from the
  retired session and does not describe the current one. Read, write and
  scheduling capabilities unknown.

## Archive

Closed items move to [records/](records/).

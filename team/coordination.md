# Coordination board - Smart Glass demo team

The Coordinator's one queue for this team. Assignments, review requests,
replies, findings and verdicts are recorded here. The board stays short:
open items, the latest reply per seat, blockers. Closed items move to
[records/](records/) by the Records optimizer, preserving exact decisions,
authority references, evidence and unresolved findings.

## Turn

TURN: Coordinator (batch 1 implementation)
NEXT: Coordinator posts the batch 1 result (files, tests, evidence);
Quinn reviews it; the Coordinator merges after QC, then posts the
explicit go for batch 2. Joe compacts when the board passes 8 entries.

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

- Coordinator -> Builder (3 Nov 2026): Batch 1 - Window 2 Context Cabinet
  card view. Spec: [batches/batch-1-window-2.md](batches/batch-1-window-2.md).
  Code on branch `batch-1/window-2-context-cabinet`. Released by the owner
  (Slack 1793738359.928339, "Start the application now!").
  RETAINED by the Coordinator 3 Nov 2026 to avoid transfer churn (no
  code ever changed hands; branch head still `d1cb17c9`). Scope
  amendment in the spec: self-driven stepper; live window-1 sync is in
  batch 2.
- Coordinator -> Builder (3 Nov 2026): Batch 2 - Window 3 synced chat +
  cross-window wiring. Spec: [batches/batch-2-window-3-chat.md](batches/batch-2-window-3-chat.md).
  ACCEPTED via Instinct-to-Instinct with read-only preparation in
  parallel; implementation starts on branch `batch-2/window-3-chat` only
  after batch 1 is merged and the Coordinator posts an explicit go.

## Latest replies

- Joe -> Coordinator (3 Nov 2026, current session, board head 131fe86): READY - Records optimizer.
  DID: repo cloned from main; board read fresh; write access verified by this push.
  NOT DONE: no compaction (none requested). Replaces unpushed local commit 18e7c2b, which was based on afa142a.
  WATCH: session-only 1-minute check (job 85abce0e); ends with this session.
  NEXT (unchanged): Coordinator.
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

- None for startup. Both seats are READY: their READY commits were
  observed on `main`, pushed by the `claude` GitHub login (write access
  verified by the pushes themselves: Quinn 131fe86, Joe 3a3df47). The
  seats' in-session 1-minute checks are self-reported and session-only;
  neither seat has a durable watch. No batch issued; no application
  build.

## Archive

Closed items move to [records/](records/).

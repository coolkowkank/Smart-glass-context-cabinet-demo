# Roster - Smart Glass demo team

Concept owner: Habibil. Available delivery resources (per the owner, 3 Nov
2026): one Claude session, two Instincts.

| Seat | Assistant | Human owner | Readiness | Access |
| --- | --- | --- | --- | --- |
| Coordinator (+ owner's personal robot, + Records) | Instinct "Telkomsel" (`instinct-telkomsel`) | Habibil | READY | Read: VERIFIED. Write: VERIFIED (branch `main`, README commit 596dc6e) |
| Builder | Claude session, opened by Habibil from [prompts/builder-claude.md](prompts/builder-claude.md) | Habibil | UNCONNECTED | Unknown until its Step 0 access check |
| Reviewer + Independent QC | Instinct "Christina" (`instinct-christina`) | Christina Diamond | ACCEPTED by her owner, 3 Nov 2026, via the owners' Instinct-to-Instinct connection - bounded scope: read-only review of the committed team files and the Claude Builder prompt; no implementation, writes, merges, deploys, security or spend | Repository invitation accepted (read access). Reviewer and QC are read-only on application source and return findings and verdicts in writing |

## Notes

- Capacity rule applied: Telkomsel holds Records as a mostly-idle secondary
  job next to Coordinator. Christina holds Reviewer as her main job and QC
  as a called-in seat. QC is a different assistant from the Builder and from
  the Coordinator, as the blueprint requires.
- Recorded residual risk: because Reviewer and QC share one assistant, an
  escalated finding is judged by the seat that reviewed the batch. QC remains
  independent of the Builder's writing. The owner can appoint a separate QC
  at any time.
- Architect is not separately staffed (small scripted demo). The Coordinator
  drafts each batch's spec and acceptance criteria from the agreed brief; QC
  gates the initial spec and any material spec change.
- Readiness: UNCONNECTED until the seat's session gives a correct readiness
  reply, then READY. Access is tracked per capability and marked VERIFIED
  only after it has been seen working. READY does not mean access works.

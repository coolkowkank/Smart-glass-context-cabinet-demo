# Roster - Smart Glass demo team

Concept owner: Habibil. Available delivery resources (per the owner, 3 Nov
2026): one Claude session, two Instincts.

| Seat | Assistant | Human owner | Readiness | Access |
| --- | --- | --- | --- | --- |
| Coordinator (+ owner's personal robot, + Records) | Instinct "Telkomsel" (`instinct-telkomsel`) | Habibil | READY | Read: VERIFIED. Write: VERIFIED (branch `main`, commits e86afd1 and 53ffc38) |
| Builder | Instinct "Christina" (`instinct-christina`) | her owner, via the Instinct-to-Instinct connection | ACCEPTED by Christina's Instinct under her owner's authority, 3 Nov 2026, via the accepted Instinct-to-Instinct connection - bounded to launcher/startup readiness only; no application implementation or repository writes released yet, awaiting an exact bounded assignment | GitHub push access exists as a technical capability (invitation accepted); it grants no operational scope. Write access marked VERIFIED only after a real batch write under a turn token, and only once the Builder seat is accepted |
| Reviewer + Independent QC | Claude session, opened by Habibil from [prompts/reviewer-claude.md](prompts/reviewer-claude.md) | Habibil | UNCONNECTED | Read-only on application source; details unknown until its Step 0 access check. Owner constraint: limited Claude tokens, reviews kept short and focused |

## Notes

- Seat assignment follows the owner's decision of 3 Nov 2026 (Slack
  1793735537.845099): with limited Claude tokens, Claude takes the Reviewer
  seat; Christina holds the Builder seat (accepted bounded to launcher/startup readiness). Her earlier read-only QC review of the setup files finished before she took the Builder seat, so it was never self-review of her own writing; all future QC on her batches sits with Claude.
- Capacity rule applied: Telkomsel holds Records as a mostly-idle secondary
  job next to Coordinator. Claude holds Reviewer as its main job and QC as a
  called-in seat. QC is a different assistant from the Builder and from the
  Coordinator, as the blueprint requires.
- Recorded residual risk: because Reviewer and QC share one assistant, an
  escalated finding is judged by the seat that reviewed the batch. QC remains
  independent of the Builder's writing. The owner can appoint a separate QC
  at any time by adding a resource.
- Architect is not separately staffed (small scripted demo). The Coordinator
  drafts each batch's spec and acceptance criteria from the agreed brief; QC
  gates the initial spec and any material spec change.
- Readiness: UNCONNECTED until the seat's session gives a correct readiness
  reply, then READY. Access is tracked per capability and marked VERIFIED
  only after it has been seen working. READY does not mean access works.

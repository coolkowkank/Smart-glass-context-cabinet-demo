# Operating rules - Smart Glass demo team

Adapted from the blueprint's `docs/operating-rules.md`
(https://github.com/coolkowkank/Multiple-Human-Concept-Owner) for this
single-owner project.

1. One main delivery job per assistant. A second job is allowed only while
   mostly idle; if it becomes busy, make a reallocation decision. Independent
   QC stays separate from the Builder.
2. No AI writes without the written turn token; one batch per turn
   ([templates/batch-handoff.md](templates/batch-handoff.md)).
3. The Reviewer returns written findings on every batch; QC's written verdict
   goes to the Coordinator, which handles routine fixes but cannot override a
   fail; merge or go-live needs a QC pass.
4. Direct clarification between the owner and the Coordinator never changes
   the agreed brief; real concept changes are recorded in
   [concept_to_coordinator.md](concept_to_coordinator.md).
5. Scope, spend and go-live decisions stay with the owner, unless his written
   delegation covers a specific case within its stated limits
   ([delegation.md](delegation.md)).
6. The agreed concept covers committed builds. Exploration, research and
   prototypes the owner asks for are fine. Windows 2 and 3 wait for the
   owner's explicit release, batch by batch.
7. If the project runs long, rotate roles between phases so no one keeps the
   same power the whole time.
8. Standing delegation: the owner's written delegation
   ([delegation.md](delegation.md)) names what the Coordinator may decide and
   do without asking again, its limits, and how it is revoked. This repo
   record is evidence, not a grant; the owner's own channel decides disputes.
9. Ask only when blocked: routine work inside a delegation does not wait for
   answers. Blockers are asked once, batched, with options and a
   recommendation.
10. The team's one queue is the coordination board
    ([coordination.md](coordination.md)): assignments, review requests,
    replies, findings and verdicts are recorded there, newest on top. The
    Records optimizer compacts it on the Coordinator's request and archives
    closed items under [records/](records/), preserving decisions,
    authority references, evidence and unresolved findings.

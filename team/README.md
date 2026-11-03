# Smart Glass demo team setup

Human-led AI project team for the Smart Glass Context Cabinet demo, adopted from
the reusable blueprint at
https://github.com/coolkowkank/Multiple-Human-Concept-Owner (read 3 Nov 2026).
The blueprint is generic and project-agnostic; this directory is this project's
instance of it. The blueprint is never modified.

## The two levels

1. **Concept level - the owner.** Habibil is the concept owner. The agreed
   concept lives in [concept_to_coordinator.md](concept_to_coordinator.md).
   Scope, spend and go-live decisions stay with him.
2. **Delivery level - the team.** The Coordinator reads its orders from the
   brief and manages the delivery seats. Available resources for this project:
   one Claude session and two Instincts.

## Seats

The live seat table, readiness and access tracking is in
[roster.md](roster.md). Summary:

- **Coordinator** - Instinct "Telkomsel" (`instinct-telkomsel`), assigned by
  the owner on 3 Nov 2026. Also the owner's personal robot (captures his
  decisions into the brief) and Records (mostly-idle secondary job).
- **Builder** - one Claude session, opened by the owner with
  [prompts/builder-claude.md](prompts/builder-claude.md). The sole writer:
  one batch per written turn token.
- **Reviewer + Independent QC** - Instinct "Christina" (`instinct-christina`).
  Written findings on every batch; QC verdicts on the consequential calls.
  A QC fail stands - the Coordinator cannot override it.
- **Architect** - not separately staffed for this small scripted demo. The
  Coordinator drafts each batch's spec and acceptance criteria from the brief;
  QC gates the initial spec and any material spec change.

## How work flows

1. The owner releases work for build; the brief records what is agreed.
2. The Coordinator issues a written turn token
   ([templates/batch-handoff.md](templates/batch-handoff.md)).
   Nobody writes without it.
3. The Builder implements exactly the batch scope, runs the tests it touches,
   and fills in the Result section with evidence.
4. The Reviewer returns written findings
   ([templates/review-findings.md](templates/review-findings.md));
   consequential findings escalate to QC
   ([templates/qc-verdict.md](templates/qc-verdict.md)).
5. Records archives handoffs, findings, verdicts and brief changes under
   [records/](records/).

Rules: [operating-rules.md](operating-rules.md).
Delegations: [delegation.md](delegation.md).

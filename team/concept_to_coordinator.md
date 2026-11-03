# Concept to Coordinator - the agreed brief

> The one agreed brief between the concept owner and the delivery team.
> The Coordinator reads its orders from here, not from side conversations.
> Clarifications never override this brief. Every concept change is recorded
> in the change history below.

## Concept

"Nordea: The Banking Context Cabinet" - a smart-glasses concept prototype.
Lauri stands in front of a flat near a Helsinki metro stop and asks his
glasses "Am I on track to buy this flat?" The answer comes from an agent that
reads his Context Cabinet: the goals he owns and the signals Nordea has
inferred about him. Nordea is used as a plain-text wordmark only; all
customer data is fictional.

The presentation demo is one scripted story across **three windows on one
computer**, following the agreed flow:

```
User -> Personal Agent in the smart glasses -> Abel -> CM -> Nordea
```

- **Window 1 - Smart glasses (built):** the multi-step story with audio
  interaction in this repository.
- **Window 2 - Context Cabinet (planned):** a standalone view that shows the
  Cabinet as a list of context cards that appear, change and reorganise as
  the story progresses.
- **Window 3 - Main-app chat (planned):** a chat view kept in sync with the
  glasses in real time, word for word.

## Goals

- A scripted audience demonstration of the three-window concept on one
  computer.
- Windows 2 and 3, once the owner releases them for build, batch by batch.
- Word-for-word sync between the glasses story and the main-app chat.

## Non-goals

- No real backend integration, no live systems, no real customer data:
  everything is staged - scripted lines, fake data, staged responses.
- No production deployment or go-live. (GitHub Pages enabling is a separate
  owner settings decision.)
- No spending and no security, access or credential changes by the team.
- Windows 2 and 3 are planned, not yet released for build. The owner
  releases each batch explicitly.

## Scope and constraints

- One repository: `coolkowkank/Smart-glass-context-cabinet-demo`,
  branch `main`.
- Resources: one Claude session (Builder), two Instincts (Telkomsel as
  Coordinator, Christina as Reviewer + Independent QC).
- Single writer under the written turn token; written findings on every
  batch; QC gates the consequential calls.
- Which storyboard moments the demo will use is still open (owner decision).

## Acceptance criteria

- The three windows run on one computer and tell the same scripted story at
  the same time.
- The main-app chat mirrors the glasses word for word, at the same moment.
- The Context Cabinet view shows which context cards the agent is using at
  each step.
- Nothing in the demo implies a real backend or real data.

## Decisions log

| Date | Decision | Agreed by |
| --- | --- | --- |
| 3 Nov 2026 | README defines the three-window scripted demo concept: window 1 built, windows 2 and 3 planned, staged data only | Habibil (Slack thread D0CDS44F00K/1793726819.689719; README commit 596dc6e) |
| 3 Nov 2026 | Team formed with one Claude + two Instincts | Habibil (Slack 1793735087.305509) |
| 3 Nov 2026 | Telkomsel (instinct-telkomsel) is the Coordinator for this team | Habibil (Slack 1793735105.232469) |

## Change history

| Date | Change | Reason | Agreed by |
| --- | --- | --- | --- |
| | | | |

# Nordea: The Banking Context Cabinet

A smart-glasses concept prototype. Lauri stands in front of a flat near a Helsinki
metro stop and asks his glasses **"Am I on track to buy this flat?"**. The answer
comes from an agent that reads his *Context Cabinet*: the goals he owns and the
signals Nordea has inferred about him. As he archives a stale goal and corrects a
wrong signal, the same question gets a better answer.

> Concept demo. Nordea is used as a plain-text wordmark only; all customer data is fictional.

## The presentation demo: one story, three windows

> Status: agreed concept. Window 1 exists in this repository; windows 2 and 3 are
> planned. This is a scripted audience demonstration, not a working system: it
> runs on fake data and staged responses, with no real backend integration
> behind it.

For presentations, the same scripted story plays across **three windows on one
computer**, following the agreed flow:

```
User -> Personal Agent in the smart glasses -> Abel -> CM -> Nordea
```

- **Window 1 - Smart glasses (built):** the multi-step story in this repository,
  with its audio interaction. Lauri speaks to the glasses and the agent answers
  out loud, with subtitles.
- **Window 2 - Context Cabinet (planned):** a standalone view that shows the
  Cabinet as a list of context cards. The cards appear, change and reorganise as
  the story progresses, so the audience can see which context the agent is using
  at each step.
- **Window 3 - Main-app chat (planned):** a chat view kept in sync with the
  glasses in real time. When Lauri says "Am I on track", the same words appear as
  his message in the chat. Abel's reply in the main app is word-for-word what the
  glasses reply, at the same moment.

The audience watches one conversation from three angles at once: what the user
experiences through the glasses, which context the agent is reading, and the
conversation as it appears in the app.

## Status

- **Built:** the smart-glasses story (window 1), the multi-step storyboard with
  audio in this repository.
- **Planned:** the standalone Context Cabinet card view (window 2) and the synced
  main-app chat view (window 3).
- Which storyboard moments the demo will use is still open.

Everything in the demo is staged: scripted lines, fake data, no live systems.

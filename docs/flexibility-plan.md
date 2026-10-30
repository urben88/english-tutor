# Flexibility plan

Ways to use the tutor beyond a single live conversation: go back to past material, re-read it, and pick it up again. Each use lists what exists today and the next step.

## What we build on

- **Sessions and messages** are stored in SQLite (`GET /api/sessions`, `GET /api/sessions/{sid}/messages`).
- **Study items** (words and phrases you listened to or explained) are stored with their explanation, source sentence and message id (`GET/POST /api/study`, `PATCH /api/study/{id}`).
- **TTS on demand** (`POST /api/tts`, normal and slow speed) and **explain on demand** (`POST /api/explain`, with `simpler`).
- **Jump to message**: the study panel opens the original session and highlights the message.

## Uses

### 1. Review past sessions
- **Today:** past sessions can be opened in the transcript drawer, and every tutor message has "Read again" and "Explain again".
- **Next:** a session list with date, topic and number of study items, plus a read-only "review" view that does not send new turns.

### 2. Resume a conversation from a point
- **Today:** you can open an old session and keep talking at its end.
- **Next:** a "Continue from here" action on any message that starts a new session seeded with the history up to that message, so the original stays untouched.

### 3. Re-read phrases
- **Today:** "Read again" replays any tutor message, and words or phrases play at normal or slow speed.
- **Next:** a "listen and repeat" loop for one message (play, pause for you to speak, compare), and an option to replay only the sentence around a study item.

### 4. Spaced review of studied words
- **Today:** study items keep `listen_count` and their explanation.
- **Next:** add `last_reviewed_at` and a due date to `study_items`, a simple spacing schedule (1, 3, 7, 14 days) and a "Review now" queue in the study panel.

### 5. Re-explain past material
- **Today:** "Explain again" and "Explain simpler" work on messages and on saved study items.
- **Next:** keep every explanation version per item (instead of only the latest), so you can compare them and keep the one that helped.

### 6. Modes
- **Free talk** (today): open conversation with the persona.
- **Guided practice** (next): the tutor builds the conversation around a topic or a set of study items and asks you to use them.
- **Review** (next): no new conversation; the tutor walks you through due study items, asking you to say them and to use them in a sentence.
- **Next step for all modes:** a `mode` field on the session and one system prompt per mode, chosen when you create the session.

## Suggested order

1. Spaced review (small schema change, high value).
2. Review mode (builds on spaced review).
3. Continue from here.
4. Guided practice.
5. Explanation history and listen-and-repeat.

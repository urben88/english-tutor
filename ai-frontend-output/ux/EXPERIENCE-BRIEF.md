# Experience brief — English Tutor (in progress)

Status: direction phase, collecting answers. Spec: `odd/tasks/study-ui.md`.
laya_consent: not asked (not used; deterministic question order).

## Answers (deduced from repo / user requests)

| ID | Answer | Source |
|---|---|---|
| q01-what | web app (local, runs on the user's PC) | repo |
| q02-who | one learner: Spanish speaker practising spoken English | repo / user |
| q03-goal | teach (practise conversation, learn words) | repo |
| q04-success | return/learn: keeps talking and reviewing studied words | user L1 |
| q05-frequency | daily | assumption |
| q06-existing | redesign of the phase 3 / voice-ux UI | repo |
| q13-areas | 3: conversation, center 3D character stage, right study panel | user L1 |
| q15-main-task | yes: the spoken conversation | repo |
| q18-persistence | history/activity: studied words, replay, resume past parts | user L1 |
| q23-realtime | some states: listening / hearing you / thinking / speaking / muted | voice-ux |
| q37-ai-features | conversational (voice tutor) | repo |
| q38-languages | UI in English, explanations in Spanish | phase 3 |
| q42-content-ready | partly: 3D character comes later (placeholder now) | user L1 |

## Answers (asked)

| ID | Answer |
|---|---|
| q12-personality / q09-feel | warm and close ("Cálida y cercana"): like talking to a person, the 3D character is the protagonist, never childish |
| q40-theme | both, follows the system |
| q28-motion | moderate: soft transitions for messages/panels, animated voice indicator; the character owns expressive motion |
| q31-devices | desktop and mobile equally |

## Classification

- Site archetype: web app · experience archetype: conversational companion + study workspace.
- Philosophy: calm, human-centred, voice-first (talking is the main task; studying is one click away, never in the way). Discarded: gamified/streak-driven (adds pressure; the user asked for warmth, not a game).
- navigation_model: `console` (one main screen with fixed areas; panels, not pages).

## Journey (short)

Open launcher → greeted by the character → talk hands-free → a word is unclear → click: hear it → "Explain" → tabs (Translation / Grammar / Examples) → word lands in the study panel → later: replay, re-explain, jump back to the sentence, resume an older session.
Friction today: explanation is a wall of text, no way to re-hear words or revisit past items, controls are scattered.

## Information architecture

Fixed areas: Conversation (transcript + per-message actions: Read again, Explain again) · Stage (3D character slot + voice status + mic controls) · Study (studied words/phrases, each with replay, re-explain, go to sentence). Session switcher in a compact header. Mobile: one area at a time with a bottom tab bar (Talk / Tutor / Study); mic controls always reachable.

## Three directions (fixed in all: 3D center, study panel right, warm tone)

1. **Safe — "Warm classroom".** Three columns: conversation left, stage center, study right. Familiar chat transcript. Palette intent: warm neutrals (cream/sand, deep cocoa in dark) with one friendly accent. Type: humanist sans, generous size. Sacrifices: the character competes with the transcript for attention. Risk: looks like a standard chat app.
2. **Differentiated — "Video call with subtitles".** The stage owns the center full-height like a video call; the last 2–3 lines appear as large clickable subtitles under the character; the full transcript slides in from the left on demand; study panel right. Voice-first, the character is truly the protagonist. Sacrifices: less transcript visible at once. Risk: reading long replies in subtitle form.
3. **Experimental — "Session timeline".** Like 1 or 2, plus a horizontal timeline at the bottom of every session: each turn and each studied word is a point you can scrub back to, to re-read, re-hear, re-explain or resume from there (this is the base for the flexibility plan). Sacrifices: more UI to learn. Risk: timeline clutter in long sessions.

Anti-generic list: no purple/blue AI gradients, no glassmorphism wallpaper, no identical card grid for words, no ALL-CAPS eyebrows, one high-impact effect per view (the character), motion only on user action or state change, respect reduced motion.

## Recommended direction

**Direction 2 — "Video call with subtitles"** (user choice, 2026-10-30). Mitigation for its risk: subtitles show the latest tutor reply with scroll inside the caption box; the full transcript drawer is one click (and a key) away.

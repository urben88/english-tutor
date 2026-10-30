# UX spec — English Tutor (Direction 2: "Video call with subtitles")

Source: `EXPERIENCE-BRIEF.md`. Path C (redesign, UX only). Skills applied: `flow-app-shell` (console shell, three areas, collapse order), `flow-ai-chat` (stop control always reachable, live status, empty state, no auto-scroll fight), `flow-empty-states`.
Limitations: Excalidraw MCP not available to this agent, so `ux-map.excalidraw` was not updated (existing map is stale); `flow-report.html` and `UX-BASELINE/DIFF` skipped to keep the task short. Baseline = old 2-column chat + explanation panel.

## Screens

| Screen / area | Purpose | Primary action | Empty | Loading | Error |
|---|---|---|---|---|---|
| Header | Session switcher, new session, voice mode switch, transcript button | Switch mode / session | one session "New session" | — | banner under header |
| Stage | Character (3D later) reacting to voice state | — (presence) | placeholder orb, state `idle` | state `thinking` | banner |
| Subtitles | Latest exchange, large, words clickable | Click a word (T2: hear it) | "Say hello to start." | "Thinking…" in status | banner |
| Voice dock | Status + level meter, Mute (M), Stop, Hold-to-talk, text input | Talk (hands-free) | — | status Thinking | mic error with text still usable |
| Transcript drawer (left) | Full conversation, same clickable words | Read / click | "Say hello to start." | — | — |
| Study panel (right) | Current explanation + studied words (T2) | Explain / replay / re-explain (T2) | "Words you study will appear here." | "Explaining…" | explanation error with reason |

## Flows

1. **Talk:** Stage (listening) -> user speaks -> status Hearing -> Thinking -> Speaking, subtitles update -> back to Listening. Branch: Mute (M) -> Muted; Stop cuts playback.
2. **Read back:** Subtitles too long -> scroll inside the caption box -> `T` or Transcript button opens the drawer -> `Esc` / backdrop closes.
3. **Study a word:** click word in subtitles/drawer -> Study panel shows explanation (T2: hear first, tabs) -> item stored (T2).
4. **Resume:** Session switcher -> pick older session -> subtitles/transcript load it.

## App shell and collapse order

Desktop (>= 1100px): header; grid `[stage 1fr][study 22rem]`; drawer overlays from the left (24rem) with a scrim; voice dock under the subtitles.
Tablet (760-1100px): study panel narrows to 18rem.
Mobile (< 760px): one area at a time via bottom tab bar **Talk** (transcript) / **Tutor** (stage + subtitles) / **Study**; the voice dock stays pinned above the tab bar; header collapses to icons.

## Audit (flow-ai-chat / flow-app-shell)

| Anti-pattern | Result |
|---|---|
| No stop control during generation | PASS (Stop in dock, always visible) |
| Auto-scroll fights the reader | PASS (scroll only on new message, inside own box) |
| Empty state = blank box | PASS (text + hint; example prompts N/A for voice) |
| Dead composer while generating | PASS (text input stays) |
| Shell scrolls the wrong regions | PASS (page fixed, regions scroll) |
| Controls unreachable on mobile | PASS (dock pinned) |

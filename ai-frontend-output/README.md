# ai-frontend-output

Selection memory of the AI Frontend Guide kit. Created by the installer and preserved on kit refreshes.

- `selections.jsonl` — append-only history of component decisions.
- `combinations.json` — named, reusable combinations of decisions.
- `SUMMARY.md` — generated summary of styles and components extracted.

Managed via `node ai-frontend-guide-kit/tools/memory.mjs` (`add`, `list`, `summary`, `combo save|list|show|apply`).
Reuse combinations across projects by copying `combinations.json` or pointing `AI_FRONTEND_OUTPUT` to a shared folder.
Recommended: commit this folder with the project (it is project history, not build output).

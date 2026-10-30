#!/usr/bin/env python3
"""
laya_select — rank candidates with the local Laya decision engine.

Datasets:
  components (default): catalog/sources/*.json (reusable UI entries).
  experience:            experience/experience-manifest.json (archetypes, philosophies,
                         styles, page-types, navigation models and questions).

Tasks:
  fit (default): is this candidate a good fit for the need?
  direction:     which archetype/philosophy/style best fits the project state?
  next-question: which eligible question should be asked next?
  options:       which option of a question best matches the user's words (--text <id|name>)?

Runs entirely on this machine (no server, no third-party APIs beyond the
one-time Hugging Face checkpoint download). Facts (license, install command,
links, manifest fields) always come from the catalog/manifest; Laya only
scores semantic fit.

Usage:
  python tools/laya_select.py --check                 # environment status (exit 0 = ready, 1 = missing)
  python tools/laya_select.py --install               # python -m pip install -U laya, then verify
  python tools/laya_select.py --need "..." [filters] --confirmed  # rank (ask the user for consent first)
  python tools/laya_select.py --need "..." --dry-run  # print state + questions without importing Laya
  python tools/laya_select.py --dataset experience --kind question --task next-question \
      --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed

Filters (components): --category --stack --license --commercial --free --source --text
Filters (experience): --kind --phase --text
Other:    --direction <id> --context/--context-file --task --top N (8 default, 12 max) --model auto|english|multilingual --json

Exit codes: 0 ok · 1 environment not ready · 2 no candidates/fallback · 3 missing consent (--confirmed)
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import time
from pathlib import Path

MIN_PYTHON = (3, 10)
MAX_CANDIDATES = 12
DEFAULT_CANDIDATES = 8
LOW_CONFIDENCE = 0.50

KIT_DIR = Path(__file__).resolve().parent.parent
CATALOG_DIR = KIT_DIR / "catalog"
SOURCES_DIR = CATALOG_DIR / "sources"
EXPERIENCE_MANIFEST = KIT_DIR / "experience" / "experience-manifest.json"
HF_CACHE = Path.home() / ".cache" / "huggingface" / "hub" / "models--convaiinnovations--laya"

DISCLAIMER = (
    "Laya scores semantic fit only (calibrated probabilities). Licenses, install "
    "commands, links and manifest fields are source facts and must be verified with "
    "`get` (components) or the manifest itself (experience)."
)


def reconfigure_stdout() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def pip_available() -> bool:
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pip", "--version"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return proc.returncode == 0
    except Exception:
        return False


def laya_installed() -> bool:
    return importlib.util.find_spec("laya") is not None


def hf_cache_info() -> dict:
    if not HF_CACHE.exists():
        return {"present": False, "size_mb": 0.0, "checkpoints": []}
    size = 0
    for file in HF_CACHE.rglob("*"):
        if file.is_file():
            try:
                size += file.stat().st_size
            except OSError:
                pass
    snapshots = HF_CACHE / "snapshots"
    checkpoints = []
    if snapshots.exists():
        for snapshot in snapshots.iterdir():
            if snapshot.is_dir():
                names = [f.name for f in snapshot.iterdir() if f.is_file()][:4]
                checkpoints.append(", ".join(names) if names else snapshot.name)
    return {"present": True, "size_mb": round(size / 1_048_576, 1), "checkpoints": checkpoints}


def run_check(as_json: bool = False) -> int:
    info = {
        "python": sys.version.split()[0],
        "python_ok": sys.version_info >= MIN_PYTHON,
        "pip_available": pip_available(),
        "laya_installed": laya_installed(),
        "hf_cache": hf_cache_info(),
    }
    info["ready"] = info["python_ok"] and info["pip_available"] and info["laya_installed"]

    if as_json:
        print(json.dumps(info, indent=2))
        return 0 if info["ready"] else 1

    print("Laya environment check (local, on this PC)")
    print(f"  python : {info['python']} {'OK' if info['python_ok'] else 'TOO OLD (need >= 3.10)'}")
    print(f"  pip    : {'OK' if info['pip_available'] else 'NOT FOUND'}")
    print(f"  laya   : {'installed' if info['laya_installed'] else 'NOT installed'}")
    cache = info["hf_cache"]
    print(f"  cache  : {cache['size_mb']} MB cached" if cache["present"] else "  cache  : empty (first run downloads checkpoints, ~0.1-1.7 GB per language)")
    print()
    if info["ready"]:
        print("Ready. Example:")
        print('  python tools/laya_select.py --need "marketing hero with animated gradient" --category hero --commercial')
    else:
        if not info["python_ok"]:
            print("Install Python 3.10+ (3.11-3.13 recommended if pip fails to find a torch wheel).")
        if not info["laya_installed"]:
            print("Install Laya with:")
            print(f'  "{sys.executable}" -m pip install -U laya')
        print("Fallback without Laya: node tools/find.mjs ... and node tools/get.mjs ...")
    return 0 if info["ready"] else 1


def run_install() -> int:
    print(f"Installing laya with: {sys.executable} -m pip install -U laya")
    proc = subprocess.run([sys.executable, "-m", "pip", "install", "-U", "laya"])
    if proc.returncode != 0:
        print("pip install failed. If no torch wheel matches your Python version, try Python 3.11-3.13.")
        return 1
    if not laya_installed():
        print("laya installed but not importable; check your environment.")
        return 1
    print("laya installed and importable. First ranking call downloads checkpoints (one time).")
    return 0


def load_entries(dataset: str = "components") -> list[dict]:
    if dataset == "experience":
        if not EXPERIENCE_MANIFEST.exists():
            print(f"Experience manifest not found at {EXPERIENCE_MANIFEST}. Run this script from the ai-frontend-guide-kit folder.")
            sys.exit(2)
        data = json.loads(EXPERIENCE_MANIFEST.read_text(encoding="utf-8"))
        return data.get("entries", [])
    if not SOURCES_DIR.exists():
        print(f"Catalog not found at {SOURCES_DIR}. Run this script from the ai-frontend-guide-kit folder.")
        sys.exit(2)
    entries: list[dict] = []
    for file in sorted(SOURCES_DIR.glob("*.json")):
        data = json.loads(file.read_text(encoding="utf-8"))
        entries.extend(data.get("entries", []))
    return entries


def matches(entry: dict, args: argparse.Namespace) -> bool:
    if args.kind and entry.get("kind") != args.kind:
        return False
    if args.phase and entry.get("phase") != args.phase:
        return False
    if args.category and entry.get("category") != args.category:
        return False
    if args.type and entry.get("entry_type") != args.type:
        return False
    if args.source and args.source.lower() not in entry.get("source", "").lower().replace(" ", "-"):
        return False
    if args.stack and not any(s.lower() == args.stack.lower() for s in entry.get("stack", [])):
        return False
    if args.license and entry.get("license_type") != args.license:
        return False
    if args.commercial and entry.get("commercial_use") is False:
        return False
    if args.free and entry.get("free") is not True:
        return False
    if args.text:
        haystack = " ".join(
            [entry.get("name", ""), entry.get("description", ""), entry.get("category", ""), entry.get("source", "")]
            + entry.get("search_tags", [])
        ).lower()
        if args.text.lower() not in haystack:
            return False
    return True


def preselect(entries: list[dict], need: str, top: int) -> list[dict]:
    if len(entries) <= top:
        return entries
    tokens = {t for t in re.split(r"[^a-z0-9]+", need.lower()) if len(t) > 2}

    def score(entry: dict) -> float:
        haystack = " ".join(
            [entry.get("name", ""), entry.get("description", ""), entry.get("use_case", "")]
            + entry.get("search_tags", [])
        ).lower()
        overlap = sum(1 for token in tokens if token in haystack)
        return overlap - (0.01 * len(haystack))

    ranked = sorted(entries, key=score, reverse=True)
    return ranked[:top]


def profile_text(entry: dict) -> str:
    return (
        f"{entry.get('name')} — {entry.get('source')} [{entry.get('category')}]. "
        f"{entry.get('description', '')} Use case: {entry.get('use_case', '')}"
    )


def resolve_direction(direction_id: str) -> str | None:
    for entry in load_entries("experience"):
        if entry.get("id") == direction_id:
            return profile_text(entry)
    return None


TASK_INSTRUCTIONS = {
    "fit": (
        "Does this candidate fit the stated UI need well enough to be reused in this project?",
        "Which single candidate best fits the stated UI need?",
    ),
    "direction": (
        "Given the project state, does this direction fit well enough to be recommended?",
        "Which single direction best fits the project state?",
    ),
    "next-question": (
        "Given the project state, is this the most valuable question to ask the user next?",
        "Which question should be asked next?",
    ),
    "options": (
        "Does this option best match the user's stated intent?",
        "Which option best matches the user's stated intent?",
    ),
}


def build_payload(
    need: str,
    context: str | None,
    candidates: list[dict],
    task: str = "fit",
    direction: str | None = None,
    direction_id: str | None = None,
) -> tuple[str, dict]:
    parts = [need]
    if direction:
        parts.append(f"Chosen experience direction ({direction_id}):\n{direction}")
    if context:
        parts.append(f"Project context:\n{context}")
    state = "\n\n".join(parts)
    fit_instruction, choice_instruction = TASK_INSTRUCTIONS.get(task, TASK_INSTRUCTIONS["fit"])
    questions: dict = {}
    for index, entry in enumerate(candidates):
        questions[f"fit_{index:02d}"] = {
            "type": "noul",
            "instructions": f"Candidate: {profile_text(entry)}\n{fit_instruction}",
        }
    questions["best_overall"] = {
        "type": "choice",
        "instructions": choice_instruction,
        "criteria": {entry["id"]: profile_text(entry) for entry in candidates},
    }
    return state, questions


def extract_choice_signal(answer: dict, ids: set[str]) -> dict:
    """Best-effort extraction of per-option probabilities from a choice answer."""
    for value in answer.values():
        if isinstance(value, dict) and ids.issubset(set(value.keys())):
            try:
                return {key: float(val) for key, val in value.items()}
            except (TypeError, ValueError):
                continue
    return {}


def run_ranking(args: argparse.Namespace) -> int:
    need = args.need
    context = args.context
    if args.context_file:
        context = Path(args.context_file).read_text(encoding="utf-8")

    direction_id = args.direction
    direction_text = None
    if direction_id:
        direction_text = resolve_direction(direction_id)
        if not direction_text:
            print(f'Warning: direction "{direction_id}" not found in experience-manifest.json; continuing without it.')
            direction_id = None

    top = max(1, min(args.top, MAX_CANDIDATES))

    if args.task == "options":
        reference = args.text or need
        question = next(
            (
                entry
                for entry in load_entries("experience")
                if entry.get("kind") == "question"
                and (entry.get("id") == reference or reference.lower() in entry.get("name", "").lower())
            ),
            None,
        )
        if not question:
            print(f'No question matching "{reference}" in experience-manifest.json (use --text <question-id|name>).')
            return 2
        candidates = [
            {
                "id": f"opt-{index + 1:02d}",
                "name": option,
                "kind": "question-option",
                "category": question["id"],
                "source": question["id"],
                "description": f'Option for the question: {question["name"]}',
                "use_case": question.get("use_case", ""),
                "search_tags": question.get("search_tags", []),
            }
            for index, option in enumerate(question.get("options", []))
        ]
    else:
        entries = [entry for entry in load_entries(args.dataset) if matches(entry, args)]
        candidates = preselect(entries, need, top)

    if not candidates:
        print("No candidates after the deterministic filter. Broaden filters (try --text or drop --stack).")
        print("Fallback: node tools/find.mjs ... (components) or the deterministic question tree (experience). No Laya call was made.")
        return 2

    state, questions = build_payload(need, context, candidates, args.task, direction_text, direction_id)

    if args.dry_run:
        if args.json:
            print(json.dumps({"need": need, "task": args.task, "dataset": args.dataset, "direction": direction_id, "state": state, "questions": questions, "candidate_ids": [c["id"] for c in candidates]}, indent=2))
        else:
            print(f"# Dry run — task {args.task} · dataset {args.dataset} · {len(candidates)} candidates preselected (no Laya import)" + (f" · direction {direction_id}" if direction_id else ""))
            for entry in candidates:
                print(f"- {entry['id']} | {entry['name']} | {entry.get('source')} | {entry.get('license_type', entry.get('kind', ''))}")
            print()
            print("State:")
            print(state if len(state) < 1500 else state[:1500] + "…")
            print()
            print("Questions:")
            print(json.dumps(questions, indent=2, ensure_ascii=False))
            print()
            print("Run without --dry-run to score these with Laya.")
        return 0

    if not args.confirmed:
        print("Laya is optional and must not run without the user's permission.")
        print("Ask the user for consent first, then repeat the same command adding --confirmed, e.g.:")
        print(f'  python tools/laya_select.py --need "{need}" --confirmed   # plus your filters')
        print("Without Laya, continue with: node tools/find.mjs ... and node tools/get.mjs ...")
        return 3

    if not laya_installed():
        print("Laya is not installed. Run: python tools/laya_select.py --check")
        print("Fallback: node tools/find.mjs ... and node tools/get.mjs ...")
        return 2

    from laya import Router  # noqa: PLC0415

    started = time.time()
    router = Router()
    predict_kwargs = {"model": args.model} if args.model and args.model != "auto" else {}
    result = router.predict(state, questions, **predict_kwargs)
    elapsed = round(time.time() - started, 1)

    answers = result.get("answers", {})
    ids = {entry["id"] for entry in candidates}
    choice_answer = answers.get("best_overall", {})
    choice_probs = extract_choice_signal(choice_answer, ids)
    chosen = choice_answer.get("choice") if isinstance(choice_answer, dict) else None

    rows = []
    for index, entry in enumerate(candidates):
        answer = answers.get(f"fit_{index:02d}", {})
        fit = answer.get("noul") if isinstance(answer, dict) else None
        rows.append(
            {
                "id": entry["id"],
                "name": entry["name"],
                "source": entry["source"],
                "category": entry["category"],
                "kind": entry.get("kind"),
                "fit": fit,
                "choice_probability": choice_probs.get(entry["id"]),
                "is_choice_pick": entry["id"] == chosen,
                "license_type": entry.get("license_type"),
                "commercial_use": entry.get("commercial_use"),
                "install_command": entry.get("install_command"),
                "docs_url": entry.get("docs_url"),
            }
        )
    rows.sort(key=lambda row: (row["fit"] is None, -(row["fit"] or 0)))

    payload = {
        "need": need,
        "task": args.task,
        "dataset": args.dataset,
        "kind": args.kind,
        "direction": direction_id,
        "elapsed_seconds": elapsed,
        "routing": result.get("routing"),
        "candidates": rows,
        "disclaimer": DISCLAIMER,
    }

    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False, default=str))
        return 0

    top_fit = rows[0]["fit"] if rows and rows[0]["fit"] is not None else None
    print(f'# Laya ranking — task {args.task} · dataset {args.dataset} — need: "{need}"')
    routing_model = (result.get("routing") or {}).get("model", "unknown")
    print(f"model: {routing_model} | candidates: {len(rows)} | {elapsed}s" + (f" | direction: {direction_id}" if direction_id else "") + (f" | choice: {chosen}" if chosen else ""))
    print()
    if args.dataset == "experience":
        print(f"{'rank':<4} {'P(fit)':<7} {'best':<5} candidate | kind | category")
        for position, row in enumerate(rows, start=1):
            fit = f"{row['fit']:.2f}" if row["fit"] is not None else "n/a"
            star = "*" if row["is_choice_pick"] else ""
            print(f"{position:<4} {fit:<7} {star:<5} {row['id']} | {row.get('kind') or ''} | {row['category']}")
    else:
        print(f"{'rank':<4} {'P(fit)':<7} {'best':<5} candidate | source | license | commercial | install")
        for position, row in enumerate(rows, start=1):
            fit = f"{row['fit']:.2f}" if row["fit"] is not None else "n/a"
            star = "*" if row["is_choice_pick"] else ""
            print(
                f"{position:<4} {fit:<7} {star:<5} {row['id']} | {row['source']} | "
                f"{row['license_type']} | {row['commercial_use']} | {row['install_command'] or row['docs_url']}"
            )
    print()
    if top_fit is not None and top_fit < LOW_CONFIDENCE:
        print(f"WARNING: low confidence (top P(fit)={top_fit:.2f}); compare alternatives or broaden filters.")
    print(DISCLAIMER)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="laya_select",
        description="Rank component-catalog or experience-manifest candidates with the local Laya decision engine.",
    )
    parser.add_argument("--check", action="store_true", help="report environment status (exit 0 = ready)")
    parser.add_argument("--install", action="store_true", help="install/update laya with pip, then verify")
    parser.add_argument("--need", help="the need/state to rank for (e.g. 'pricing table with monthly toggle', or the brief summary)")
    parser.add_argument("--dataset", choices=["components", "experience"], default="components", help="which manifest to rank (default: components)")
    parser.add_argument("--kind", choices=["archetype", "philosophy", "style", "page-type", "question", "navigation-model"], help="experience entry kind filter")
    parser.add_argument("--phase", type=int, help="question phase filter (experience dataset)")
    parser.add_argument("--task", choices=["fit", "direction", "next-question", "options"], default="fit", help="instruction template (default: fit)")
    parser.add_argument("--direction", help="experience direction id (experience-manifest.json) injected into the state for better fit")
    parser.add_argument("--context", help="extra project context (PRODUCT.md excerpt, tokens intent…)")
    parser.add_argument("--context-file", help="read the context from a file instead")
    parser.add_argument("--category")
    parser.add_argument("--type")
    parser.add_argument("--stack")
    parser.add_argument("--license")
    parser.add_argument("--commercial", action="store_true")
    parser.add_argument("--free", action="store_true")
    parser.add_argument("--source")
    parser.add_argument("--text")
    parser.add_argument("--top", type=int, default=DEFAULT_CANDIDATES)
    parser.add_argument("--model", choices=["auto", "english", "multilingual"], default="auto")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="print state + questions without importing Laya")
    parser.add_argument("--confirmed", action="store_true", help="confirm the user consented to running the model (required for ranking)")
    return parser


def main() -> int:
    reconfigure_stdout()
    parser = build_parser()
    args = parser.parse_args()

    if args.check:
        return run_check(as_json=args.json)
    if args.install:
        return run_install()
    if not args.need:
        parser.print_help()
        print("\nNothing to do: pass --check, --install or --need \"...\".")
        return 0
    return run_ranking(args)


if __name__ == "__main__":
    sys.exit(main())

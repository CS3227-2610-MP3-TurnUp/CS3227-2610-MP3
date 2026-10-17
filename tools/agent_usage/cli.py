"""Command-line entry point for local, offline usage accounting."""
import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys
import uuid
from pathlib import Path

from . import __version__
from .common import atomic_json, registry, state_path


def initialize(state, owner, repo, codex_home=None):
    repo = Path(repo).expanduser().resolve()
    config = json.loads((repo / ".codex" / "agent-usage.json").read_text(encoding="utf-8"))
    if not isinstance(config, dict) or config.get("schema_version") != 1 or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", config.get("project_id", "")):
        raise ValueError("Invalid or unsupported shared project config")
    path = state / "registry.json"
    if path.exists():
        data = registry(state)
        if data["owner"] != owner:
            raise ValueError("This ledger belongs to another contributor; use a separate --state directory")
        if codex_home and str(Path(codex_home).expanduser().resolve()) != data["codex_home"]:
            raise ValueError("Codex home differs from this registry; use a separate --state directory")
    else:
        data = {"version": 1, "machine_id": str(uuid.uuid4()), "owner": owner,
                "codex_home": str(Path(codex_home or os.environ.get("CODEX_HOME", Path.home() / ".codex")).expanduser().resolve()),
                "projects": []}
    project = next((p for p in data["projects"] if p["project_id"] == config["project_id"]), None)
    if project is None:
        project = {"project_id": config["project_id"], "name": config.get("name", config["project_id"]),
                   "timezone": config.get("timezone", "Asia/Singapore"), "roots": []}
        data["projects"].append(project)
    roots = {str(repo)}
    # Discover other worktrees only when they carry this same logical project ID.
    try:
        result = subprocess.run(["git", "-C", str(repo), "worktree", "list", "--porcelain"],
                                capture_output=True, text=True, timeout=10, check=True)
        for line in result.stdout.splitlines():
            if line.startswith("worktree "):
                root = Path(line[len("worktree "):]).resolve()
                try:
                    other = json.loads((root / ".codex" / "agent-usage.json").read_text(encoding="utf-8"))
                    if other.get("project_id") == project["project_id"]:
                        roots.add(str(root))
                except FileNotFoundError:
                    # git enumerated this worktree from the same repository; older branches
                    # may predate the shared tracking config but their history still belongs here.
                    roots.add(str(root))
                except (OSError, ValueError):
                    pass
    except (OSError, subprocess.SubprocessError):
        pass
    project["roots"] = sorted(set(project["roots"]) | roots)
    atomic_json(path, data)
    return {"owner": owner, "project_id": project["project_id"], "registered_roots": len(project["roots"])}


def parser():
    root = argparse.ArgumentParser(description="Offline Codex project usage ledger (Python 3.11+)")
    root.add_argument("--state", help="Local data directory; defaults to TURNUP_USAGE_STATE or ~/.turnup-agent-usage")
    root.add_argument("--version", action="version", version=__version__)
    sub = root.add_subparsers(dest="command", required=True)
    p = sub.add_parser("init", help="Register an owner and project checkout")
    p.add_argument("--owner", required=True, choices=("keith", "darryl"))
    p.add_argument("--repo", required=True)
    p.add_argument("--codex-home")
    p = sub.add_parser("collect", help="Read complete, newly available usage records")
    p.add_argument("--all", action="store_true", help="Rescan source files; response identities remain deduplicated")
    p.add_argument("--scheduled", action="store_true", help="Refresh reports and acknowledge queued events after success")
    p = sub.add_parser("bind", help="Explicitly assign a root thread and descendants to a change")
    p.add_argument("--thread", required=True)
    p.add_argument("--change", required=True)
    p.add_argument("--wp")
    p.add_argument("--from-turn")
    p = sub.add_parser("annotate", help="Record explicit task evaluation; no automatic acceptance claims")
    p.add_argument("--root-turn", required=True)
    p.add_argument("--phase", required=True, choices=("planning", "implementation", "review", "correction", "delivery", "other"))
    p.add_argument("--outcome", required=True, choices=("accepted", "needs_changes", "abandoned"))
    p.add_argument("--evidence", default="", help="Short human-entered evidence; exports redact local paths")
    p = sub.add_parser("report", help="Generate an offline HTML report and CSV tables")
    p.add_argument("--output", help="Report directory; defaults to STATE/reports")
    p = sub.add_parser("export", help="Write privacy-limited normalized JSONL")
    p.add_argument("--output", help="Defaults to STATE/exports/OWNER.jsonl")
    p = sub.add_parser("import", help="Atomically import one or more normalized exports")
    p.add_argument("files", nargs="+")
    for name in ("setup", "uninstall"):
        p = sub.add_parser(name, help="Preview automation changes; use --apply to install/remove")
        p.add_argument("--apply", action="store_true")
        p.add_argument("--platform", choices=("darwin", "win32"), help="Preview a platform's artifacts; apply requires the actual platform")
    sub.add_parser("hook", help="Internal lifecycle event queue handler")
    sub.add_parser("doctor", help="Inspect collection and automation health")
    return root


def execute(args, state):
    if args.command == "init":
        return initialize(state, args.owner, args.repo, args.codex_home)
    if args.command == "hook":
        from .automation import hook
        data = sys.stdin.read(1_048_577)
        if len(data) > 1_048_576:
            raise ValueError("Hook event too large")
        event = json.loads(data)
        if not isinstance(event, dict):
            raise ValueError("Hook event must be a JSON object")
        hook(state, event)
        return {}
    registry(state)
    if args.command in ("setup", "uninstall"):
        from . import automation
        return getattr(automation, args.command)(state, platform_name=args.platform, apply=args.apply)
    if args.command == "doctor":
        from .automation import doctor
        from .store import Ledger
        data = doctor(state)
        snap = Ledger(state).snapshot()
        data["ledger"] = {k: len(snap.get(k, [])) for k in ("threads", "responses", "diagnostics", "collections")}
        data["queued_events"] = len(list((state / "queue").glob("*.json")))
        data["python"] = sys.version.split()[0]
        data["tool_version"] = __version__
        data["last_collection"] = snap.get("collections", [])[-1:] or []
        return data
    if args.command == "collect":
        from .collector import collect, process_events
        # Only acknowledge events that existed before this run. Newly arriving events stay queued.
        queued = list((state / "queue").glob("*.json")) if args.scheduled else []
        result = collect(state, full=args.all)
        if args.scheduled:
            events, malformed = {}, 0
            for path in queued:
                try:
                    events[path.name] = json.loads(path.read_text(encoding="utf-8"))
                except (OSError, ValueError):
                    malformed += 1
            processed = process_events(state, events)
            from .report import generate
            from .store import Ledger
            result["report"] = generate(Ledger(state).snapshot(), state / "reports")
            consumed = set(processed["consumed"])
            for path in queued:
                if path.name in consumed:
                    path.unlink(missing_ok=True)
            result["queue"] = {"acknowledged": len(consumed), "pending": len(processed["pending"]),
                               "rejected": len(processed["rejected"]) + malformed}
        return result
    if args.command in ("bind", "annotate", "report"):
        from .store import Ledger
        ledger = Ledger(state)
        if args.command == "bind":
            if not re.fullmatch(r"CHG-[KD]-\d{3,}(?:-[a-z0-9-]+)?", args.change):
                raise ValueError("Change ID must be CHG-K-NNN or CHG-D-NNN (optional slug)")
            if args.wp and not re.fullmatch(r"WP-\d{3}", args.wp):
                raise ValueError("Work package must be WP-NNN")
            return ledger.bind(args.thread, args.change, wp=args.wp, from_turn=args.from_turn)
        if args.command == "annotate":
            if len(args.evidence) > 2000:
                raise ValueError("Evidence must be at most 2000 characters")
            return ledger.annotate(args.root_turn, args.phase, args.outcome, args.evidence)
        from .report import generate
        return generate(ledger.snapshot(), Path(args.output).expanduser().resolve() if args.output else state / "reports")
    if args.command in ("export", "import"):
        from .exchange import export_data, import_data
        if args.command == "export":
            output = Path(args.output).expanduser().resolve() if args.output else state / "exports" / (registry(state)["owner"] + ".jsonl")
            return export_data(state, output)
        return import_data(state, [Path(p).expanduser().resolve() for p in args.files])
    raise ValueError("Unsupported command")


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        result = execute(args, state_path(args.state))
        print(json.dumps(result if result is not None else {"ok": True}, default=str, indent=2))
        return 0
    except (ValueError, OSError, RuntimeError, KeyError, sqlite3.Error) as error:
        # Never include raw hook payloads or transcript lines in errors.
        print(f"Agent usage: {error}", file=sys.stderr)
        if args.command == "hook":
            print("{}")
        return 1

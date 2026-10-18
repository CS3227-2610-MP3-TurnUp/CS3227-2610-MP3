"""Local lifecycle queue and reversible, explicitly applied automation.

Hooks only write allowlisted metadata. They never read transcripts, steer the
agent, or trust themselves. The scheduled collector is the recovery mechanism.
"""
import base64
import hashlib
import json
import os
import platform
import plistlib
import re
import shlex
import shutil
import subprocess
import sys
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

from .common import atomic_json, now, registry
from .privacy import ensure_private_state

EVENTS = ("SessionStart", "SubagentStart", "SubagentStop", "Stop", "Interrupt", "SessionEnd")
MARKER = "TurnUp agent usage queue (managed)"
TRUST_NOTE = "Open /hooks in Codex to review and trust the exact new or changed hooks. No trust was granted by this tool."
_SAFE = re.compile(r"^[A-Za-z0-9_.:/@+ -]{1,256}$")


def _safe(value):
    return value if isinstance(value, str) and _SAFE.fullmatch(value) else None


def _association(state, session):
    return state / "hook_sessions" / (hashlib.sha256(session.encode()).hexdigest() + ".json")


def hook(state, event):
    """Queue one private, minimal event; caller emits only {} to hook stdout."""
    state = Path(state)
    if not isinstance(event, dict) or event.get("hook_event_name") not in EVENTS:
        return {"queued": False, "reason": "unsupported_event"}
    session = _safe(event.get("session_id"))
    if session is None:
        return {"queued": False, "reason": "missing_session"}
    state = ensure_private_state(state)
    config = registry(state)
    project_id = None
    cwd = event.get("cwd")
    if isinstance(cwd, str):
        location = Path(cwd).expanduser().resolve()
        for project in config["projects"]:
            if any(location.is_relative_to(Path(root).resolve()) for root in project["roots"]):
                project_id = project["project_id"]
                break
    known = _association(state, session)
    if project_id is None and known.exists():
        try:
            candidate = json.loads(known.read_text(encoding="utf-8")).get("project_id")
            if candidate in {p["project_id"] for p in config["projects"]}:
                project_id = candidate
        except (ValueError, OSError):
            pass
    if project_id is None:
        return {"queued": False, "reason": "unregistered_project"}
    record = {"version": 1, "project_id": project_id, "event": event["hook_event_name"],
              "session_id": session, "time": now()}
    for name in ("agent_id", "agent_type", "turn_id"):
        value = _safe(event.get(name))
        if value is not None:
            record[name] = value
    atomic_json(known, {"project_id": project_id})
    if record.get("agent_id"):
        atomic_json(_association(state, record["agent_id"]), {"project_id": project_id})
    atomic_json(state / "queue" / (uuid.uuid4().hex + ".json"), record)
    return {"queued": True}


def _platform(value):
    selected = value or platform.system()
    aliases = {"Darwin": "macos", "macos": "macos", "darwin": "macos",
               "Windows": "windows", "windows": "windows", "win32": "windows"}
    if selected not in aliases:
        raise ValueError("Automation supports macOS and Windows only; use collect manually on this platform.")
    return aliases[selected]


def _check_apply_platform(selected, apply):
    if apply and selected != _platform(None):
        raise ValueError("Cannot apply automation for a different operating system. Generate a preview instead, or apply on the target operating system.")


def _read_hooks(path):
    if not path.exists():
        return {"hooks": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        raise ValueError("Cannot parse existing hooks.json; repair it before setup/uninstall.") from exc
    if not isinstance(data, dict) or not isinstance(data.get("hooks", {}), dict):
        raise ValueError("Existing hooks.json must contain an object of hook events.")
    for groups in data.get("hooks", {}).values():
        if not isinstance(groups, list):
            raise ValueError("Existing hooks.json contains unsupported event groups; left unchanged.")
        for group in groups:
            if not isinstance(group, dict) or not isinstance(group.get("hooks"), list):
                raise ValueError("Existing hooks.json contains unsupported hook groups; left unchanged.")
            if any(not isinstance(handler, dict) for handler in group["hooks"]):
                raise ValueError("Existing hooks.json contains unsupported hook handlers; left unchanged.")
    return data


def _manifest(state):
    path = state / "automation.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != 1:
        raise ValueError("Unsupported automation manifest; left unchanged.")
    return data


def _remove_owned(data, manifest):
    """Only exact installed handler definitions belong to us; preserve edits."""
    owned = list(manifest.get("handlers", {}).items()) if manifest else []
    if manifest:
        owned += [(item["event"], item["handler"]) for item in manifest.get("previous_handlers", [])]
    hooks = data.setdefault("hooks", {})
    for event, handler in owned:
        groups = []
        for group in hooks.get(event, []):
            remaining = [item for item in group["hooks"] if item != handler]
            if remaining or not group["hooks"]:
                groups.append({**group, "hooks": remaining})
        if event in hooks:
            if groups:
                hooks[event] = groups
            else:
                del hooks[event]
    return data


def _commands(state, selected):
    launcher = state / "runtime" / "usage_launcher.py"
    args = [str(Path(sys.executable).resolve()), str(launcher), "--state", str(state)]
    if selected == "windows":
        # Explicitly select PowerShell: the hook docs don't promise a default
        # Windows shell. EncodedCommand avoids a second shell's interpolation.
        quoted = ["'" + arg.replace("'", "''") + "'" for arg in args]
        script = "& " + " ".join(quoted) + " hook; exit $LASTEXITCODE"
        encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
        command = "powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand " + encoded
    else:
        command = shlex.join(args + ["hook"])
    return args, command


def _runtime(state):
    source = Path(__file__).resolve().parent.parent
    target = state / "runtime"
    target.mkdir(parents=True, exist_ok=True)
    # Only this package and the package marker are installed; no repo data/logs.
    if source != target / "tools":
        destination = target / "tools" / "agent_usage"
        shutil.copytree(source / "agent_usage", destination, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        shutil.copy2(source / "__init__.py", target / "tools" / "__init__.py")
    launcher = target / "usage_launcher.py"
    launcher.write_text("import runpy\nimport sys\nfrom pathlib import Path\n"
                        "sys.path.insert(0, str(Path(__file__).resolve().parent))\n"
                        "runpy.run_module('tools.agent_usage', run_name='__main__')\n", encoding="utf-8")


def _schedule(state, selected, args):
    suffix = hashlib.sha256(str(state).encode()).hexdigest()[:12]
    if selected == "macos":
        label = "org.turnup.agent-usage." + suffix
        filename = label + ".plist"
        content = plistlib.dumps({"Label": label, "ProgramArguments": args + ["collect", "--scheduled"],
                                 "StartInterval": 300, "RunAtLoad": True,
                                 "StandardOutPath": str(state / "scheduler.stdout.log"),
                                 "StandardErrorPath": str(state / "scheduler.stderr.log")})
        return label, filename, content, Path.home() / "Library" / "LaunchAgents" / filename
    label = "TurnUpAgentUsage-" + suffix
    namespace = "http://schemas.microsoft.com/windows/2004/02/mit/task"
    ET.register_namespace("", namespace)
    def element(parent, name, value=None):
        result = ET.SubElement(parent, "{" + namespace + "}" + name)
        if value is not None:
            result.text = value
        return result
    task = ET.Element("{" + namespace + "}Task", {"version": "1.2"})
    registration = element(task, "RegistrationInfo")
    element(registration, "Description", "TurnUp local agent usage collector")
    triggers = element(task, "Triggers")
    timer = element(triggers, "TimeTrigger")
    repetition = element(timer, "Repetition")
    element(repetition, "Interval", "PT5M")
    element(repetition, "StopAtDurationEnd", "false")
    element(timer, "StartBoundary", datetime.now().replace(microsecond=0).isoformat())
    element(timer, "Enabled", "true")
    login = element(triggers, "LogonTrigger")
    element(login, "Enabled", "true")
    settings = element(task, "Settings")
    element(settings, "MultipleInstancesPolicy", "IgnoreNew")
    element(settings, "DisallowStartIfOnBatteries", "false")
    element(settings, "StopIfGoingOnBatteries", "false")
    element(settings, "StartWhenAvailable", "true")
    element(settings, "ExecutionTimeLimit", "PT1H")
    actions = element(task, "Actions")
    execution = element(actions, "Exec")
    element(execution, "Command", args[0])
    element(execution, "Arguments", subprocess.list2cmdline(args[1:] + ["collect", "--scheduled"]))
    element(execution, "WorkingDirectory", str(state / "runtime"))
    return label, label + ".xml", ET.tostring(task, encoding="utf-8", xml_declaration=True), None


@contextmanager
def _setup_lock(state):
    state = ensure_private_state(state)
    path = state / "automation.lock"
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise ValueError("Another setup/uninstall is active; remove automation.lock only after confirming it stopped.") from exc
    try:
        os.close(fd)
        yield
    finally:
        path.unlink(missing_ok=True)


def _run(args, allow_missing=False):
    try:
        result = subprocess.run(args, capture_output=True, text=True, check=False, timeout=30)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError("Scheduler command failed; runtime and data retained. Run doctor and retry setup/uninstall.") from exc
    if result.returncode and not allow_missing:
        raise ValueError("Scheduler command failed; runtime and data retained. Check OS scheduler permissions and retry.")
    return result


def _bootout(label):
    result = _run(["launchctl", "bootout", "gui/" + str(os.getuid()) + "/" + label], allow_missing=True)
    if result.returncode not in (0, 3, 113):
        raise ValueError("Cannot unload the launchd job; check OS permissions and retry. Runtime and data retained.")


def setup(state, platform_name=None, apply=False):
    """Prepare local artifacts; mutate hooks and scheduler only with apply=True."""
    state = Path(state).expanduser()
    selected = _platform(platform_name)
    _check_apply_platform(selected, apply)
    state = ensure_private_state(state)
    config = registry(state)
    hook_path = Path(config["codex_home"]) / "hooks.json"
    with _setup_lock(state):
        previous = _manifest(state)
        if previous and previous["platform"] != selected:
            raise ValueError("Uninstall the previous platform's automation before changing platforms.")
        original = _read_hooks(hook_path)
        data = _remove_owned(json.loads(json.dumps(original)), previous)
        args, command = _commands(state, selected)
        handlers = {}
        for event in EVENTS:
            handler = {"type": "command", "command": command, "timeout": 3,
                       "statusMessage": MARKER}
            if selected == "windows":
                handler["commandWindows"] = command
            handlers[event] = handler
            data["hooks"].setdefault(event, []).append({"hooks": [handler]})
        label, filename, schedule, destination = _schedule(state, selected, args)
        preview = state / "setup"
        preview.mkdir(parents=True, exist_ok=True)
        atomic_json(preview / "hooks.json", data)
        schedule_path = preview / filename
        schedule_path.write_bytes(schedule)
        result = {"applied": False, "platform": selected, "hooks_preview": str(preview / "hooks.json"),
                  "schedule_preview": str(schedule_path), "trust": TRUST_NOTE}
        if not apply:
            return result
        # Capture ownership before writing global hooks so partial installs can
        # always be removed. Preserve existing user/plugin/inline definitions.
        _runtime(state)
        if _read_hooks(hook_path) != original:
            raise ValueError("hooks.json changed during setup; no global hooks updated. Retry after the other edit finishes.")
        if destination and destination.exists() and not previous:
            raise ValueError("The generated launchd file already exists without an ownership manifest; inspect it before installing.")
        history = list((previous or {}).get("previous_handlers", []))
        for event, handler in (previous or {}).get("handlers", {}).items():
            entry = {"event": event, "handler": handler}
            if entry not in history:
                history.append(entry)
        manifest = {"version": 1, "platform": selected, "label": label,
                    "hook_path": str(hook_path), "handlers": handlers,
                    "previous_handlers": history,
                    "schedule_path": str(destination or schedule_path),
                    "installed_at": now(), "scheduler_registered": False}
        atomic_json(state / "automation.json", manifest)
        atomic_json(hook_path, data)
        if selected == "macos":
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(schedule)
            target = "gui/" + str(os.getuid())
            _bootout(label)
            _run(["launchctl", "bootstrap", target, str(destination)])
        else:
            _run(["schtasks", "/Create", "/TN", label, "/XML", str(schedule_path), "/F"])
        manifest["scheduler_registered"] = True
        atomic_json(state / "automation.json", manifest)
        return {**result, "applied": True, "scheduler_registered": True}


def uninstall(state, platform_name=None, apply=False):
    """Remove exact installed hooks and job. Retain runtime, ledger and exports."""
    state = Path(state).expanduser()
    selected = _platform(platform_name) if platform_name else None
    if selected is not None:
        _check_apply_platform(selected, apply)
    if state.exists() or state.is_symlink():
        state = ensure_private_state(state)
    initial = _manifest(state)
    if not initial:
        return {"applied": False, "installed": False}
    selected = selected or _platform(initial["platform"])
    _check_apply_platform(selected, apply)
    with _setup_lock(state):
        manifest = _manifest(state)
        if manifest != initial:
            raise ValueError("Automation installation changed during uninstall; retry after the other operation finishes.")
        if selected != manifest["platform"]:
            raise ValueError("Uninstall must run on the installed platform.")
        path = Path(manifest["hook_path"])
        data = _remove_owned(_read_hooks(path), manifest)
        preview = state / "setup" / "uninstall-hooks.json"
        atomic_json(preview, data)
        if not apply:
            return {"applied": False, "hooks_preview": str(preview), "data_retained": True}
        if selected == "macos":
            _bootout(manifest["label"])
            Path(manifest["schedule_path"]).unlink(missing_ok=True)
        else:
            query = _run(["schtasks", "/Query", "/TN", manifest["label"]], allow_missing=True)
            if not query.returncode:
                _run(["schtasks", "/Delete", "/TN", manifest["label"], "/F"])
            elif manifest.get("scheduler_registered"):
                raise ValueError("Cannot query the installed task; verify it is absent or accessible before retrying uninstall.")
        atomic_json(path, data)
        # Keep modified former handlers actionable, never delete their runtime.
        leftovers = sum(1 for groups in data["hooks"].values() for group in groups
                        for handler in group["hooks"] if handler.get("statusMessage") == MARKER)
        (state / "automation.json").unlink()
        return {"applied": True, "data_retained": True, "runtime_retained": True,
                "modified_handlers_retained": leftovers}


def doctor(state):
    state = ensure_private_state(Path(state).expanduser())
    config = registry(state)
    manifest = _manifest(state)
    hooks = _read_hooks(Path(config["codex_home"]) / "hooks.json")
    installed = sum(handler in group["hooks"] for event, handler in (manifest or {}).get("handlers", {}).items()
                    for group in hooks.get("hooks", {}).get(event, []))
    return {"initialized": True, "automation_installed": manifest is not None,
            "installed_handlers": installed, "expected_handlers": len(EVENTS) if manifest else 0,
            "runtime_present": (state / "runtime" / "usage_launcher.py").exists(),
            "scheduler_registration_recorded": (manifest or {}).get("scheduler_registered", False),
            "queue_events": len(list((state / "queue").glob("*.json"))), "trust": TRUST_NOTE,
            "scheduler_live_status": "Not queried; recorded installation is not a live scheduler or hook-trust check.",
            "hook_support": "Local orchestration/execution only; cloud orchestration does not run local command hooks. Scheduled collection remains available."}

"""Small shared helpers. Persistent data is private to the local machine."""
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def now():
    return datetime.now(timezone.utc).isoformat()


def state_path(value=None):
    return Path(value or os.environ.get("TURNUP_USAGE_STATE", Path.home() / ".turnup-agent-usage")).expanduser().resolve()


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".pending-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=True, indent=2)
            handle.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def registry(state):
    path = Path(state) / "registry.json"
    if not path.exists():
        raise ValueError("Not initialized. Run init --owner keith|darryl --repo PATH first.")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != 1:
        raise ValueError("Unsupported local registry version")
    return data

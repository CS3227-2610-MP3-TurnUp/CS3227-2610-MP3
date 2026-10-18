"""Small shared helpers. Persistent data is private to the local machine."""
import json
import os
import tempfile
import time
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
        # Windows can deny replacement briefly while another hook publishes
        # the same destination or a reader holds it without delete sharing.
        # Retain the complete temporary document and retry only these errors;
        # 0.63s total backoff stays below the three-second hook timeout.
        for attempt in range(7):
            try:
                os.replace(temporary, path)
                break
            except OSError as error:
                if getattr(error, "winerror", None) not in (5, 32, 33) or attempt == 6:
                    raise
                time.sleep(0.01 * 2 ** attempt)
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

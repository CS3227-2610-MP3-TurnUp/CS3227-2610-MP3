"""Exercise the user-facing workflow through real subprocesses and synthetic logs."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tools.agent_usage.cli import initialize

ROOT = Path(__file__).resolve().parents[2]


class CliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.repo = self.home / "repo with spaces"
        (self.repo / ".codex").mkdir(parents=True)
        (self.repo / ".codex" / "agent-usage.json").write_text(json.dumps({
            "schema_version": 1, "project_id": "turnup", "name": "TurnUp", "timezone": "Asia/Singapore"}), encoding="utf-8")
        self.codex = self.home / "codex"
        (self.codex / "sessions").mkdir(parents=True)
        self.state = self.home / "state"
        self.call("init", "--owner", "keith", "--repo", str(self.repo), "--codex-home", str(self.codex))

    def call(self, *args, ok=True, stdin=None):
        result = subprocess.run([sys.executable, "-m", "tools.agent_usage", "--state", str(self.state), *args],
                                cwd=ROOT, input=stdin, capture_output=True, text=True, timeout=30)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        return result

    def log(self):
        records = [
            {"type": "session_meta", "timestamp": "2026-10-18T00:00:00Z", "payload": {
                "id": "thread-root", "cwd": str(self.repo), "source": "vscode", "model_provider": "openai", "cli_version": "synthetic"}},
            {"type": "turn_context", "timestamp": "2026-10-18T00:00:01Z", "payload": {
                "turn_id": "turn-1", "root_turn_id": "turn-1", "model": "gpt-6.1-sol", "effort": "high"}},
            {"type": "token_usage_record", "timestamp": "2026-10-18T00:00:02Z", "payload": {
                "response_id": "response-1", "thread_id": "thread-root", "turn_id": "turn-1", "root_turn_id": "turn-1",
                "usage": {"input_tokens": 1000, "cached_input_tokens": 200, "cache_write_input_tokens": 0,
                          "output_tokens": 100, "reasoning_output_tokens": 20, "total_tokens": 1100}}}
        ]
        (self.codex / "sessions" / "rollout.jsonl").write_text("".join(json.dumps(row) + "\n" for row in records), encoding="utf-8")

    def test_full_workflow_and_repeated_import(self):
        self.log()
        self.call("collect", "--all")
        self.call("collect")
        self.call("bind", "--thread", "thread-root", "--change", "CHG-K-003", "--wp", "WP-001")
        self.call("annotate", "--root-turn", "turn-1", "--phase", "implementation", "--outcome", "accepted", "--evidence", "Synthetic check")
        self.call("report")
        self.assertTrue((self.state / "reports" / "index.html").exists())
        export = self.home / "share.jsonl"
        self.call("export", "--output", str(export))
        text = export.read_text(encoding="utf-8")
        self.assertNotIn(str(self.repo), text)
        self.assertNotIn(str(self.codex), text)
        self.call("import", str(export))
        self.call("import", str(export))
        from tools.agent_usage.store import Ledger
        snapshot = Ledger(self.state).snapshot()
        self.assertEqual(len(snapshot["responses"]), 1)
        self.assertEqual(snapshot["responses"][0]["total_tokens"], 1100)
        self.call("doctor")

    def test_hook_does_not_emit_model_context(self):
        event = {"hook_event_name": "Stop", "session_id": "thread-root", "turn_id": "turn-1", "cwd": str(self.repo),
                 "last_assistant_message": "DO NOT EXPORT this private synthetic message"}
        result = self.call("hook", stdin=json.dumps(event))
        self.assertEqual(json.loads(result.stdout), {})
        queues = list((self.state / "queue").glob("*.json"))
        self.assertEqual(len(queues), 1)
        self.assertNotIn("DO NOT EXPORT", queues[0].read_text(encoding="utf-8"))
        self.log()
        self.call("collect", "--scheduled")
        self.assertEqual(list((self.state / "queue").glob("*.json")), [])

    def test_scheduled_collection_persists_lifecycle_and_keeps_pending_events(self):
        self.log()
        queue = self.state / "queue"
        queue.mkdir()
        base = {"version": 1, "project_id": "turnup", "session_id": "thread-root"}
        (queue / "start.json").write_text(json.dumps({**base, "event": "SessionStart", "time": "2026-10-18T00:00:00Z"}), encoding="utf-8")
        (queue / "end.json").write_text(json.dumps({**base, "event": "SessionEnd", "time": "2026-10-18T00:01:00Z"}), encoding="utf-8")
        (queue / "pending.json").write_text(json.dumps({**base, "session_id": "not-yet-written", "event": "SessionEnd", "time": "2026-10-18T00:01:00Z"}), encoding="utf-8")
        result = json.loads(self.call("collect", "--scheduled").stdout)
        self.assertEqual(result["queue"], {"acknowledged": 2, "pending": 1, "rejected": 0})
        self.assertEqual([p.name for p in queue.glob("*.json")], ["pending.json"])
        from tools.agent_usage.store import Ledger
        from tools.agent_usage.report import build
        report = build(Ledger(self.state).snapshot())
        self.assertEqual(report["threads"][0]["completed_lifecycle_seconds"], 60)

    def test_bad_user_inputs_and_owner_change_are_errors(self):
        self.call("init", "--owner", "darryl", "--repo", str(self.repo), ok=False)
        self.call("bind", "--thread", "unknown", "--change", "bad", ok=False)
        result = self.call("hook", stdin="not json", ok=False)
        self.assertEqual(json.loads(result.stdout), {})

    def test_setup_is_preview_by_default(self):
        self.call("setup", "--platform", "win32")
        self.assertFalse((self.codex / "hooks.json").exists())
        self.assertTrue((self.state / "setup").is_dir())

    def test_init_is_idempotent(self):
        initialize(self.state, "keith", self.repo)
        data = json.loads((self.state / "registry.json").read_text(encoding="utf-8"))
        self.assertEqual(len(data["projects"]), 1)
        self.assertEqual(data["projects"][0]["roots"], [str(self.repo.resolve())])


if __name__ == "__main__":
    unittest.main()

"""Synthetic automation checks: no test installs a real hook or OS job."""
import base64
import concurrent.futures
import json
import plistlib
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from xml.etree import ElementTree as ET

from tools.agent_usage import automation
from tools.agent_usage.common import atomic_json


class AutomationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="usage tests ")
        self.addCleanup(self.temporary.cleanup)
        self.home = Path(self.temporary.name).resolve()
        self.state = self.home / "usage state"
        self.repo = self.home / "repo with spaces"
        self.repo.mkdir()
        self.codex = self.home / "codex home"
        self.codex.mkdir()
        atomic_json(self.state / "registry.json", {
            "version": 1, "owner": "keith", "machine_id": "machine",
            "codex_home": str(self.codex),
            "projects": [{"project_id": "turnup", "roots": [str(self.repo)]}],
        })
        self.event = {"hook_event_name": "SessionStart", "session_id": "root-1",
                      "cwd": str(self.repo), "prompt": "secret prompt",
                      "transcript_path": "/secret/location", "model": "ignored-model"}
        self.hooks = self.codex / "hooks.json"
        uid_patch = patch.object(automation.os, "getuid", return_value=501, create=True)
        uid_patch.start()
        self.addCleanup(uid_patch.stop)
        host_patch = patch.object(automation.platform, "system", return_value="Darwin")
        host_patch.start()
        self.addCleanup(host_patch.stop)

    def test_hook_privacy_and_concurrent_queue(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(lambda _: automation.hook(self.state, self.event), range(24)))
        self.assertTrue(all(result["queued"] for result in results))
        records = list((self.state / "queue").glob("*.json"))
        self.assertEqual(24, len(records))
        for path in records:
            record = json.loads(path.read_text())
            self.assertEqual({"version", "project_id", "event", "session_id", "time"}, set(record))
            self.assertNotIn("secret", path.read_text())

    def test_subagent_parent_identity_and_cwd_association(self):
        automation.hook(self.state, self.event)
        child = {**self.event, "hook_event_name": "SubagentStart", "cwd": str(self.home / "elsewhere"),
                 "agent_id": "child-1", "agent_type": "worker", "turn_id": "turn-1"}
        self.assertTrue(automation.hook(self.state, child)["queued"])
        grandchild = {**child, "session_id": "child-1", "agent_id": "grandchild-1"}
        self.assertTrue(automation.hook(self.state, grandchild)["queued"])
        records = [json.loads(path.read_text()) for path in (self.state / "queue").glob("*.json")]
        record = next(item for item in records if item.get("agent_id") == "child-1")
        self.assertEqual("root-1", record["session_id"])
        self.assertEqual("child-1", record["agent_id"])

    def test_hook_ignores_unrelated_roots_and_bad_ids(self):
        unrelated = {**self.event, "cwd": str(self.home / "elsewhere")}
        self.assertFalse(automation.hook(self.state, unrelated)["queued"])
        prefix = {**self.event, "cwd": str(self.repo) + "-other"}
        self.assertFalse(automation.hook(self.state, prefix)["queued"])
        self.assertFalse(automation.hook(self.state, {**self.event, "session_id": "bad\nvalue"})["queued"])
        self.assertFalse(automation.hook(self.state, {**self.event, "hook_event_name": "Unknown"})["queued"])
        self.assertFalse((self.state / "queue").exists())

    def test_mac_preview_has_absolute_quoted_commands_and_no_external_mutation(self):
        original = {"description": "User hooks", "hooks": {"Stop": [{"hooks": [{"type": "command", "command": "existing"}]}]}}
        atomic_json(self.hooks, original)
        with patch.object(automation.subprocess, "run") as execute:
            result = automation.setup(self.state, "darwin")
        execute.assert_not_called()
        self.assertFalse(result["applied"])
        self.assertEqual(original, json.loads(self.hooks.read_text()))
        self.assertFalse((self.state / "runtime").exists())
        preview = json.loads(Path(result["hooks_preview"]).read_text())
        handler = preview["hooks"]["Stop"][-1]["hooks"][0]
        args = shlex.split(handler["command"])
        self.assertTrue(Path(args[0]).is_absolute())
        self.assertEqual(["--state", str(self.state), "hook"], args[-3:])
        schedule = plistlib.loads(Path(result["schedule_preview"]).read_bytes())
        self.assertEqual(300, schedule["StartInterval"])
        self.assertTrue(schedule["RunAtLoad"])
        self.assertEqual(["collect", "--scheduled"], schedule["ProgramArguments"][-2:])
        self.assertEqual(str(self.state), schedule["ProgramArguments"][3])

    def test_windows_preview_has_repeat_login_and_escaped_commands(self):
        result = automation.setup(self.state, "win32")
        preview = json.loads(Path(result["hooks_preview"]).read_text())
        handler = preview["hooks"]["SubagentStop"][0]["hooks"][0]
        self.assertIn("commandWindows", handler)
        self.assertTrue(handler["commandWindows"].startswith("powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand "))
        script = base64.b64decode(handler["commandWindows"].split()[-1]).decode("utf-16le")
        self.assertIn("'" + str(self.state) + "'", script)
        self.assertTrue(script.endswith("hook; exit $LASTEXITCODE"))
        namespace = {"t": "http://schemas.microsoft.com/windows/2004/02/mit/task"}
        task = ET.parse(result["schedule_preview"])
        self.assertEqual("PT5M", task.findtext("t:Triggers/t:TimeTrigger/t:Repetition/t:Interval", namespaces=namespace))
        self.assertIsNotNone(task.find("t:Triggers/t:LogonTrigger", namespace))
        self.assertIn('"' + str(self.state) + '"', task.findtext("t:Actions/t:Exec/t:Arguments", namespaces=namespace))

    def test_setup_repeat_uninstall_preserves_other_hooks_and_data(self):
        original = {"description": "Preserve this", "extra": {"retained": True}, "hooks": {
            "Stop": [{"matcher": "ignored", "hooks": [{"type": "command", "command": "my-user-hook"}]}],
            "PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "mcp_tool", "server": "plugin", "tool": "check"}]}]}}
        atomic_json(self.hooks, original)
        inline = self.codex / "config.toml"
        inline.write_text('[hooks]\n# unrelated inline hooks\n')
        with patch.object(automation.Path, "home", return_value=self.home), patch.object(automation.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as execute:
            automation.setup(self.state, "darwin", apply=True)
            automation.setup(self.state, "darwin", apply=True)
            data = json.loads(self.hooks.read_text())
            self.assertEqual(2, len(data["hooks"]["Stop"]))
            self.assertEqual(6, automation.doctor(self.state)["installed_handlers"])
            self.assertTrue((self.state / "runtime/tools/agent_usage/automation.py").exists())
            (self.state / "kept-data").write_text("data")
            automation.uninstall(self.state, apply=True)
            self.assertFalse(automation.uninstall(self.state, apply=True)["installed"])
            self.assertGreaterEqual(execute.call_count, 5)
        self.assertEqual(original, json.loads(self.hooks.read_text()))
        self.assertEqual('[hooks]\n# unrelated inline hooks\n', inline.read_text())
        self.assertTrue((self.state / "kept-data").exists())
        self.assertTrue((self.state / "runtime/usage_launcher.py").exists())

    def test_edited_handlers_survive_uninstall(self):
        completed = subprocess.CompletedProcess([], 0)
        with patch.object(automation.platform, "system", return_value="Windows"), patch.object(automation.subprocess, "run", return_value=completed):
            automation.setup(self.state, "windows", apply=True)
            data = json.loads(self.hooks.read_text())
            data["hooks"]["Stop"][0]["hooks"][0]["timeout"] = 2
            atomic_json(self.hooks, data)
            result = automation.uninstall(self.state, apply=True)
        self.assertEqual(1, result["modified_handlers_retained"])
        self.assertEqual(2, json.loads(self.hooks.read_text())["hooks"]["Stop"][0]["hooks"][0]["timeout"])

    def test_uninstall_preview_does_not_change_existing_installation(self):
        with patch.object(automation.platform, "system", return_value="Windows"), patch.object(automation.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
            automation.setup(self.state, "windows", apply=True)
        original = self.hooks.read_bytes()
        with patch.object(automation.subprocess, "run") as execute:
            result = automation.uninstall(self.state)
        execute.assert_not_called()
        self.assertFalse(result["applied"])
        self.assertEqual(original, self.hooks.read_bytes())
        self.assertTrue((self.state / "automation.json").exists())

    def test_failed_mac_unload_does_not_claim_uninstall_or_remove_hooks(self):
        with patch.object(automation.Path, "home", return_value=self.home), patch.object(automation.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
            automation.setup(self.state, "darwin", apply=True)
        original = self.hooks.read_bytes()
        with patch.object(automation.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)):
            with self.assertRaises(ValueError):
                automation.uninstall(self.state, apply=True)
        self.assertEqual(original, self.hooks.read_bytes())
        self.assertTrue((self.state / "automation.json").exists())

    def test_windows_hook_literals_handle_apostrophes_and_dollar_signs(self):
        state = self.home / "usage ' $state"
        atomic_json(state / "registry.json", json.loads((self.state / "registry.json").read_text()))
        result = automation.setup(state, "windows")
        data = json.loads(Path(result["hooks_preview"]).read_text())
        command = data["hooks"]["Stop"][0]["hooks"][0]["commandWindows"]
        script = base64.b64decode(command.split()[-1]).decode("utf-16le")
        self.assertIn("'" + str(state).replace("'", "''") + "'", script)
        self.assertNotIn("$state", command)

    def test_setup_lock_is_actionable_and_never_changes_hooks(self):
        (self.state / "automation.lock").write_text("active")
        with self.assertRaisesRegex(ValueError, "Another setup/uninstall"):
            automation.setup(self.state, "darwin", apply=True)
        self.assertFalse(self.hooks.exists())

    def test_bad_existing_hooks_and_unsupported_platform_left_unchanged(self):
        self.hooks.write_text('{invalid json')
        with self.assertRaises(ValueError), patch.object(automation.subprocess, "run") as execute:
            automation.setup(self.state, "macos", apply=True)
        execute.assert_not_called()
        self.assertEqual('{invalid json', self.hooks.read_text())
        self.assertFalse((self.state / "runtime").exists())
        with self.assertRaises(ValueError):
            automation.setup(self.state, "Linux", apply=True)

    def test_scheduler_failure_preserves_recovery_manifest_and_runtime(self):
        with patch.object(automation.platform, "system", return_value="Windows"), patch.object(automation.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)):
            with self.assertRaises(ValueError):
                automation.setup(self.state, "windows", apply=True)
        report = automation.doctor(self.state)
        self.assertTrue(report["automation_installed"])
        self.assertTrue(report["runtime_present"])
        self.assertFalse(report["scheduler_registration_recorded"])
        self.assertIn("review", report["trust"])
        with patch.object(automation.platform, "system", return_value="Windows"), patch.object(automation.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)):
            self.assertTrue(automation.uninstall(self.state, apply=True)["applied"])

    def test_foreign_apply_rejected_before_any_state_or_hook_mutation(self):
        for host, target in (("Darwin", "windows"), ("Windows", "darwin")):
            with self.subTest(host=host, target=target):
                before = {str(path.relative_to(self.home)): path.read_bytes()
                          for path in self.home.rglob("*") if path.is_file()}
                absent = self.home / "uninitialized state"
                with patch.object(automation.platform, "system", return_value=host), patch.object(automation.subprocess, "run") as execute:
                    for action in (automation.setup, automation.uninstall):
                        with self.assertRaisesRegex(ValueError, "different operating system"):
                            action(self.state, target, apply=True)
                        with self.assertRaisesRegex(ValueError, "different operating system"):
                            action(absent, target, apply=True)
                    execute.assert_not_called()
                self.assertFalse(absent.exists())
                after = {str(path.relative_to(self.home)): path.read_bytes()
                         for path in self.home.rglob("*") if path.is_file()}
                self.assertEqual(before, after)
                self.assertFalse((self.state / "setup").exists())
                self.assertFalse((self.state / "automation.lock").exists())

    def test_foreign_manifest_uninstall_rejected_before_preview_or_changes(self):
        with patch.object(automation.platform, "system", return_value="Windows"), patch.object(automation.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
            automation.setup(self.state, "windows", apply=True)
        before = {str(path.relative_to(self.home)): path.read_bytes()
                  for path in self.home.rglob("*") if path.is_file()}
        with patch.object(automation.subprocess, "run") as execute:
            with self.assertRaisesRegex(ValueError, "different operating system"):
                automation.uninstall(self.state, apply=True)
        execute.assert_not_called()
        after = {str(path.relative_to(self.home)): path.read_bytes()
                 for path in self.home.rglob("*") if path.is_file()}
        self.assertEqual(before, after)
        self.assertFalse((self.state / "setup/uninstall-hooks.json").exists())
        self.assertFalse(automation.uninstall(self.state)["applied"])


if __name__ == "__main__":
    unittest.main()

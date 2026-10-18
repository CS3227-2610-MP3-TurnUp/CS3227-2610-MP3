"""Synthetic checks for private local state and ledger protection."""
import concurrent.futures
import json
import os
import sqlite3
import stat
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from tools.agent_usage import automation, privacy
from tools.agent_usage.cli import execute, initialize, parser
from tools.agent_usage.common import atomic_json


class PrivacyTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="usage privacy ")
        self.addCleanup(self.temporary.cleanup)
        self.home = Path(self.temporary.name)
        self.state = self.home / "usage state"

    def assert_private(self, state=None, ledger=None):
        state = state or self.state
        ledger = ledger or state / "ledger.sqlite3"
        if os.name == "posix":
            self.assertEqual(stat.S_IMODE(state.stat().st_mode), 0o700)
            self.assertEqual(stat.S_IMODE(ledger.stat().st_mode), 0o600)
        else:
            self.assertTrue(privacy._windows_acl_matches(state, True, self._windows_user_sid()))
            self.assertTrue(privacy._windows_acl_matches(ledger, False, self._windows_user_sid()))

    @staticmethod
    def _windows_user_sid():
        api = privacy._windows_api()
        token, buffer, sid = privacy._windows_sid(api)
        try:
            return sid
        finally:
            api["kernel"].CloseHandle(token)

    def test_new_directory_and_ledger_are_private(self):
        path = privacy.ensure_private_ledger(self.state)
        canonical_state = self.state.resolve()
        self.assertEqual(path, canonical_state / "ledger.sqlite3")
        self.assert_private(canonical_state, path)
        self.assertEqual(path.read_bytes(), b"")

    def test_existing_permissive_state_and_ledger_are_repaired_without_data_change(self):
        self.state.mkdir()
        db_path = self.state / "ledger.sqlite3"
        with closing(sqlite3.connect(db_path)) as db, db:
            db.execute("CREATE TABLE facts (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            db.execute("INSERT INTO facts VALUES (?, ?)", ("synthetic", "preserve me"))
        before = db_path.read_bytes()
        if os.name == "posix":
            os.chmod(self.state, 0o755)
            os.chmod(db_path, 0o644)
        else:
            self._set_world_dacl(self.state)
            self._set_world_dacl(db_path)

        privacy.ensure_private_ledger(self.state)

        self.assert_private()
        self.assertEqual(db_path.read_bytes(), before)
        with closing(sqlite3.connect(db_path)) as db, db:
            self.assertEqual(db.execute("SELECT value FROM facts WHERE key='synthetic'").fetchone(), ("preserve me",))

    def test_concurrent_initialization_preserves_one_empty_ledger(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            paths = list(pool.map(lambda _: privacy.ensure_private_ledger(self.state), range(24)))
        canonical_state = self.state.resolve()
        self.assertTrue(all(path == canonical_state / "ledger.sqlite3" for path in paths))
        self.assert_private(canonical_state, canonical_state / "ledger.sqlite3")
        with closing(sqlite3.connect(canonical_state / "ledger.sqlite3")) as db, db:
            db.execute("CREATE TABLE concurrent_check (value TEXT)")
            db.execute("INSERT INTO concurrent_check VALUES ('ok')")

    def test_protection_failure_stops_init_hook_and_setup_before_writes(self):
        repo = self.home / "repo"
        (repo / ".codex").mkdir(parents=True)
        (repo / ".codex" / "agent-usage.json").write_text(json.dumps({
            "schema_version": 1, "project_id": "turnup"}), encoding="utf-8")
        protector = "_ensure_windows_directory" if os.name == "nt" else "_ensure_posix_directory"
        with patch.object(privacy, protector, side_effect=privacy.PrivacyError("synthetic ACL failure")):
            with self.assertRaisesRegex(privacy.PrivacyError, "synthetic ACL failure"):
                initialize(self.state, "keith", repo)
            self.assertFalse((self.state / "registry.json").exists())

            event = {"hook_event_name": "Stop", "session_id": "synthetic", "cwd": str(repo)}
            # Set up the registry using a separate, already-private directory;
            # the failing hook must stop before it publishes queue or session data.
            ready = self.home / "ready state"
            atomic_json(ready / "registry.json", {
                "version": 1, "owner": "keith", "machine_id": "machine", "codex_home": str(self.home),
                "projects": [{"project_id": "turnup", "roots": [str(repo)]}],
            })
            with self.assertRaisesRegex(privacy.PrivacyError, "synthetic ACL failure"):
                automation.hook(ready, event)
            self.assertFalse((ready / "queue").exists())

            with self.assertRaisesRegex(privacy.PrivacyError, "synthetic ACL failure"):
                automation.setup(self.state, "darwin")
            self.assertFalse((self.state / "setup").exists())
            self.assertFalse((self.state / "automation.json").exists())

    def test_foreign_platform_apply_fails_before_state_security_or_writes(self):
        args = parser().parse_args(["setup", "--platform", "win32", "--apply"])
        with patch.object(automation.platform, "system", return_value="Darwin"), \
                patch("tools.agent_usage.cli.ensure_private_state", side_effect=AssertionError("state was secured")), \
                patch("tools.agent_usage.automation.ensure_private_state", side_effect=AssertionError("state was secured")):
            with self.assertRaisesRegex(ValueError, "different operating system"):
                execute(args, self.state)
        self.assertFalse(self.state.exists())

    @unittest.skipUnless(os.name == "posix", "POSIX symlink and mode assertions")
    def test_symlinks_and_nonregular_ledger_are_rejected_without_chmod_outside_state(self):
        outside = self.home / "outside.sqlite3"
        outside.write_text("synthetic outside data", encoding="utf-8")
        os.chmod(outside, 0o644)
        self.state.mkdir()
        (self.state / "ledger.sqlite3").symlink_to(outside)
        with self.assertRaises(privacy.PrivacyError):
            privacy.ensure_private_ledger(self.state)
        self.assertEqual(stat.S_IMODE(outside.stat().st_mode), 0o644)
        self.assertEqual(outside.read_text(encoding="utf-8"), "synthetic outside data")

        (self.state / "ledger.sqlite3").unlink()
        (self.state / "ledger.sqlite3").mkdir()
        with self.assertRaises(privacy.PrivacyError):
            privacy.ensure_private_ledger(self.state)

    @unittest.skipUnless(os.name == "nt", "Native Windows ACL inspection")
    def test_windows_native_acl_is_repaired_to_a_protected_current_user_dacl(self):
        ledger = privacy.ensure_private_ledger(self.state)
        sid = self._windows_user_sid()
        self.assertTrue(privacy._windows_acl_matches(self.state, True, sid))
        self.assertTrue(privacy._windows_acl_matches(ledger, False, sid))

        self._set_world_dacl(self.state)
        self.assertFalse(privacy._windows_acl_matches(self.state, True, sid))
        privacy.ensure_private_state(self.state)
        self.assertTrue(privacy._windows_acl_matches(self.state, True, sid))

        self._set_world_dacl(ledger)
        self.assertFalse(privacy._windows_acl_matches(ledger, False, sid))
        privacy.ensure_private_ledger(self.state)
        self.assertTrue(privacy._windows_acl_matches(ledger, False, sid))

    @staticmethod
    def _set_world_dacl(path):
        """Use native APIs to create an intentionally permissive Windows fixture."""
        import ctypes
        from ctypes import wintypes

        api = privacy._windows_api()
        advapi = api["advapi"]
        void_p = ctypes.c_void_p
        descriptor = void_p()
        advapi.ConvertStringSecurityDescriptorToSecurityDescriptorW.argtypes = [
            wintypes.LPCWSTR, wintypes.DWORD, ctypes.POINTER(void_p), ctypes.POINTER(wintypes.DWORD),
        ]
        advapi.ConvertStringSecurityDescriptorToSecurityDescriptorW.restype = wintypes.BOOL
        advapi.GetSecurityDescriptorDacl.argtypes = [
            void_p, ctypes.POINTER(wintypes.BOOL), ctypes.POINTER(void_p), ctypes.POINTER(wintypes.BOOL),
        ]
        advapi.GetSecurityDescriptorDacl.restype = wintypes.BOOL
        if not advapi.ConvertStringSecurityDescriptorToSecurityDescriptorW(
                "D:P(A;;FA;;;WD)", 1, ctypes.byref(descriptor), None):
            raise OSError(ctypes.get_last_error(), "Could not create the synthetic world-access DACL")
        try:
            present = wintypes.BOOL()
            defaulted = wintypes.BOOL()
            dacl = void_p()
            if not advapi.GetSecurityDescriptorDacl(descriptor, ctypes.byref(present), ctypes.byref(dacl), ctypes.byref(defaulted)):
                raise OSError(ctypes.get_last_error(), "Could not read the synthetic world-access DACL")
            result = advapi.SetNamedSecurityInfoW(str(path), 1, 0x00000004 | 0x80000000,
                                                  None, None, dacl, None)
            if result:
                raise OSError(result, "Could not apply the synthetic world-access DACL")
        finally:
            api["kernel"].LocalFree(descriptor)


if __name__ == "__main__":
    unittest.main()

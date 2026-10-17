"""Deterministic Windows replacement regressions, runnable on every CI host."""
import errno
import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.agent_usage.common import atomic_json


def windows_error(code):
    error = PermissionError(errno.EACCES, "Synthetic Windows file contention")
    error.winerror = code
    return error


class AtomicJsonTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.target = self.directory / "association.json"
        atomic_json(self.target, {"project_id": "original"})

    def test_transient_windows_contention_retries_complete_same_file(self):
        replace = os.replace
        for code in (5, 32, 33):
            with self.subTest(winerror=code):
                sources = []

                def contended(source, destination):
                    sources.append(source)
                    # The previous JSON remains readable while the new complete
                    # document is waiting to be atomically published.
                    self.assertEqual({"project_id": "original"}, json.loads(self.target.read_text()))
                    self.assertEqual({"project_id": "turnup"}, json.loads(Path(source).read_text()))
                    if len(sources) < 3:
                        raise windows_error(code)
                    return replace(source, destination)

                with patch("os.replace", side_effect=contended) as attempt, patch.object(time, "sleep") as sleep:
                    atomic_json(self.target, {"project_id": "turnup"})
                self.assertEqual(3, attempt.call_count)
                self.assertEqual(1, len(set(sources)))
                self.assertEqual([0.01, 0.02], [call.args[0] for call in sleep.call_args_list])
                self.assertEqual({"project_id": "turnup"}, json.loads(self.target.read_text()))
                self.assertEqual([], list(self.directory.glob(".pending-*")))
                atomic_json(self.target, {"project_id": "original"})

    def test_persistent_windows_error_is_bounded_and_preserves_destination(self):
        error = windows_error(5)
        with patch("os.replace", side_effect=error) as attempt, patch.object(time, "sleep") as sleep:
            with self.assertRaises(PermissionError) as raised:
                atomic_json(self.target, {"project_id": "turnup"})
        self.assertIs(error, raised.exception)
        self.assertEqual(7, attempt.call_count)
        self.assertEqual(6, sleep.call_count)
        self.assertLess(sum(call.args[0] for call in sleep.call_args_list), 1)
        self.assertEqual({"project_id": "original"}, json.loads(self.target.read_text()))
        self.assertEqual([], list(self.directory.glob(".pending-*")))

    def test_other_errors_propagate_immediately_and_clean_up(self):
        for error in (PermissionError(errno.EACCES, "Non-Windows permission failure"), windows_error(2)):
            with self.subTest(error=error), patch("os.replace", side_effect=error) as attempt, patch.object(time, "sleep") as sleep:
                with self.assertRaises(OSError) as raised:
                    atomic_json(self.target, {"project_id": "turnup"})
                self.assertIs(error, raised.exception)
                attempt.assert_called_once()
                sleep.assert_not_called()
                self.assertEqual({"project_id": "original"}, json.loads(self.target.read_text()))
                self.assertEqual([], list(self.directory.glob(".pending-*")))


if __name__ == "__main__":
    unittest.main()

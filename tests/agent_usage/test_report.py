import csv
import json
import tempfile
import unittest
from pathlib import Path

from tools.agent_usage.report import build, generate, price


def response(**updates):
    row = dict(provider="openai", response_id="r1", project_id="turnup", owner="keith",
               thread_id="root", turn_id="t1", root_turn_id="t1", timestamp="2026-10-18T17:00:00Z",
               model="gpt-6.1-sol", effort="high", tier="standard", input_tokens=100000,
               cached_input_tokens=20000, cache_write_input_tokens=10000, output_tokens=10000,
               reasoning_output_tokens=5000, total_tokens=110000)
    row.update(updates)
    return row


def snapshot():
    return dict(projects=[dict(project_id="turnup", timezone="Asia/Singapore")],
                threads=[dict(thread_id="root", parent_thread_id=None, project_id="turnup", role="coordinator",
                              started_at="2026-10-18T16:50:00Z", ended_at="2026-10-18T17:10:00Z"),
                         dict(thread_id="child", parent_thread_id="root", project_id="turnup", role="reviewer",
                              started_at="2026-10-18T16:55:00Z", ended_at="2026-10-18T17:05:00Z")],
                turns=[dict(turn_id="t1", thread_id="root", root_turn_id="t1", started_at="2026-10-18T16:50:00Z", ended_at="2026-10-18T17:06:00Z")],
                responses=[response(), response(response_id="r2", thread_id="child", timestamp="2026-10-18T17:04:00Z")],
                bindings=[dict(thread_id="root", change_id="CHG-K-003", wp="WP-001", from_turn=None)],
                annotations=[dict(root_turn_id="t1", phase="implementation", outcome="accepted", evidence="synthetic")],
                diagnostics=[dict(code="usage_missing", count=1, raw="PRIVATE TRANSCRIPT")],
                collections=[dict(timestamp="2026-10-18T17:20:00Z", success=True)])


class PricingTests(unittest.TestCase):
    def test_subset_pricing_and_standard_comparison(self):
        p = price(response())
        self.assertAlmostEqual(p["estimated_credits"], 6.55)
        self.assertAlmostEqual(p["api_equivalent_usd"], .267)
        self.assertEqual(price(response(reasoning_output_tokens=9999)), p)
        self.assertEqual(p["api_tier_basis"], "standard")

    def test_known_tiers_and_unknown_tier_assumption(self):
        self.assertAlmostEqual(price(response(tier="fast"))["estimated_credits"], 13.1)
        self.assertAlmostEqual(price(response(tier="priority"))["api_equivalent_usd"], .534)
        self.assertAlmostEqual(price(response(tier="ultrafast"))["api_equivalent_usd"], 1.602)
        self.assertAlmostEqual(price(response(tier="flex"))["api_equivalent_usd"], .1335)
        self.assertEqual(price(response(model="gpt-6-luna", tier="ultrafast"))["api_status"], "unsupported_tier")
        self.assertEqual(price(response(tier=None))["credit_tier_basis"], "Standard assumed")

    def test_long_context_applies_to_full_api_request_only_above_boundary(self):
        base = response(input_tokens=272000, cached_input_tokens=0, cache_write_input_tokens=0, output_tokens=10000)
        self.assertAlmostEqual(price(base)["api_equivalent_usd"], .644)
        base["input_tokens"] += 1
        self.assertAlmostEqual(price(base)["api_equivalent_usd"], 1.238004)

    def test_unknown_and_missing_counts_not_implicitly_zero(self):
        self.assertIsNone(price(response(model="auto-review"))["estimated_credits"])
        self.assertIsNone(price(response(cached_input_tokens=None))["estimated_credits"])
        self.assertIsNone(price(response(cache_write_input_tokens=None))["api_equivalent_usd"])
        self.assertIsNone(price(response(cached_input_tokens=100001))["estimated_credits"])
        self.assertIsNone(price(response(cache_write_input_tokens=100000))["api_equivalent_usd"])
        self.assertIsNone(price(response(input_tokens=True))["estimated_credits"])


class ReportTests(unittest.TestCase):
    def test_symbolic_agent_paths_distinguish_workers_and_export_safely(self):
        data = snapshot()
        for thread, path in zip(data["threads"], ("/root/usage_core", "/root/usage_reports")):
            thread.update(role="worker", agent_path=path)
        data["threads"].append(dict(thread_id="unsafe", role="worker", agent_path="/Users/private/source"))
        data["responses"].append(response(response_id="r3", thread_id="unsafe"))
        out = build(data)
        paths = {row["value"] for row in out["rollups"] if row["dimension"] == "agent_path"}
        self.assertEqual(paths, {"/root/usage_core", "/root/usage_reports", "unknown"})
        self.assertEqual({row["agent"] for row in out["responses"]}, {"worker"})
        with tempfile.TemporaryDirectory() as directory:
            result = generate(data, Path(directory))
            for kind in ("responses", "threads"):
                with Path(result["paths"][kind]).open(newline="") as handle:
                    rows = list(csv.DictReader(handle))
                self.assertEqual({row["agent_path"] for row in rows}, paths)
            html = Path(result["paths"]["html"]).read_text()
            self.assertNotIn("/Users/private/source", html)
            self.assertIn("'agent_path'", html)
        for path in (None, "/root/../../secret", "/root/.ssh", "/root/task<script>", "/root/task\n"):
            data["threads"][0]["agent_path"] = path
            self.assertEqual(build(data)["responses"][0]["agent_path"], "unknown")

    def test_descendants_attribution_timing_and_deduplication(self):
        data = snapshot()
        data["responses"].append(data["responses"][0].copy())
        out = build(data)
        self.assertEqual(out["summary"]["responses"], 2)
        self.assertEqual({r["change"] for r in out["responses"]}, {"CHG-K-003"})
        self.assertEqual({r["day"] for r in out["responses"]}, {"2026-10-19"})
        self.assertAlmostEqual(out["summary"]["estimated_credits"], 13.1)
        self.assertEqual(out["summary"]["summed_completed_agent_lifecycle_seconds"], 1800)
        self.assertEqual(out["threads"][0]["completed_lifecycle_seconds"], 1200)
        self.assertEqual(out["tasks"][0]["observed_response_span_seconds"], 240)
        self.assertEqual(out["tasks"][0]["task_elapsed_seconds"], 960)
        self.assertEqual(out["summary"]["missing_task_elapsed_bounds"], 0)
        self.assertEqual(out["summary"]["accepted_tasks"], 1)
        self.assertAlmostEqual(out["summary"]["credits_per_fully_priced_accepted_task"], 13.1)

    def test_incomplete_accepted_task_not_reported_as_complete_cost(self):
        data = snapshot()
        data["responses"][1]["output_tokens"] = None
        data["threads"].append(dict(thread_id="empty"))
        out = build(data)
        self.assertEqual(out["summary"]["output_tokens"], 10000)
        self.assertEqual(out["summary"]["output_tokens_missing"], 1)
        self.assertEqual(out["summary"]["threads_without_responses"], 1)
        self.assertEqual(out["summary"]["fully_credit_priced_accepted_tasks"], 0)
        self.assertIsNone(out["summary"]["credits_per_fully_priced_accepted_task"])

    def test_unbound_unknown_time_and_lifecycle(self):
        data = snapshot()
        data["bindings"] = []
        data["responses"][0]["timestamp"] = "2026-10-18T17:00:00"
        data["threads"][0]["ended_at"] = None
        data["projects"][0]["timezone"] = "Invalid/Timezone"
        out = build(data)
        self.assertEqual(out["summary"]["unbound_responses"], 2)
        self.assertEqual(out["summary"]["invalid_timestamps"], 1)
        self.assertEqual(out["summary"]["missing_agent_lifecycle_spans"], 1)
        self.assertEqual(out["summary"]["timezone_fallbacks"], 1)

    def test_missing_invalid_or_foreign_turn_bounds_do_not_infer_elapsed(self):
        for end in (None, "invalid", "2026-10-18T16:40:00Z", "2026-10-18T17:06:00"):
            with self.subTest(end=end):
                data = snapshot()
                data["turns"][0]["ended_at"] = end
                out = build(data)
                self.assertIsNone(out["tasks"][0]["task_elapsed_seconds"])
                self.assertEqual(out["summary"]["missing_task_elapsed_bounds"], 1)
                self.assertEqual(out["tasks"][0]["observed_response_span_seconds"], 240)
        data = snapshot()
        data["turns"][0]["thread_id"] = "child"
        self.assertIsNone(build(data)["tasks"][0]["task_elapsed_seconds"])

    def test_task_elapsed_csv_and_html_columns(self):
        with tempfile.TemporaryDirectory() as directory:
            result = generate(snapshot(), Path(directory))
            with Path(result["paths"]["tasks"]).open(newline="") as handle:
                task = next(csv.DictReader(handle))
            self.assertEqual(float(task["task_elapsed_seconds"]), 960)
            self.assertEqual(float(task["observed_response_span_seconds"]), 240)
            self.assertIn("Observed root-turn elapsed", Path(result["paths"]["html"]).read_text())

    def test_offline_html_allowlist_escaping_and_csv_formulas(self):
        data = snapshot()
        payload = '</script><script>alert("test")</script>'
        data["responses"][0]["model"] = payload
        data["responses"][0]["owner"] = "  =danger()"
        data["responses"][0]["raw"] = "PRIVATE TRANSCRIPT"
        data["projects"][0]["roots"] = ["/Users/private/repository"]
        with tempfile.TemporaryDirectory() as directory:
            result = generate(data, Path(directory))
            html = Path(result["paths"]["html"]).read_text()
            self.assertNotIn(payload, html)
            self.assertIn('\\u003c/script\\u003e', html)
            self.assertNotIn("PRIVATE TRANSCRIPT", html)
            self.assertNotIn("/Users/private/repository", html)
            self.assertNotIn('src="https://', html)
            self.assertNotIn("innerHTML", html)
            encoded = html.split('<script id="report-data" type="application/json">')[1].split('</script>')[0]
            self.assertEqual(json.loads(encoded)["responses"][0]["model"], payload)
            with Path(result["paths"]["responses"]).open(newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(rows[0]["contributor"], "'  =danger()")

    def test_empty_snapshot_reports_unknown_totals(self):
        out = build({})
        self.assertEqual(out["summary"]["responses"], 0)
        self.assertIsNone(out["summary"]["estimated_credits"])
        with tempfile.TemporaryDirectory() as directory:
            result = generate({}, Path(directory))
            self.assertTrue(Path(result["paths"]["html"]).exists())

    def test_diagnostics_use_latest_collection_per_contributor_machine(self):
        data = snapshot()
        data["collections"] = [dict(owner="keith", machine_id="m1", collected_at="2026-10-18T17:00:00Z"),
                               dict(owner="keith", machine_id="m1", collected_at="2026-10-18T18:00:00Z"),
                               dict(owner="darryl", machine_id="m2", collected_at="2026-10-18T17:00:00Z")]
        data["diagnostics"] = [dict(owner="keith", machine_id="m1", collected_at="2026-10-18T17:00:00Z", code="missing", count=7),
                               dict(owner="darryl", machine_id="m2", collected_at="2026-10-18T17:00:00Z", code="missing", count=2)]
        out = build(data)
        self.assertEqual(out["diagnostics"], [dict(code="missing", count=2)])
        self.assertEqual(out["last_collection"], "2026-10-18T18:00:00+00:00")


if __name__ == "__main__":
    unittest.main()

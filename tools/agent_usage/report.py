"""Offline, allowlisted usage reports. Estimates are comparisons, never bills."""
import csv
import json
import os
import re
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .store import attribute, discover_root_tasks, root_task_bounds

DIMENSIONS = ("project", "day", "contributor", "change", "wp", "agent", "agent_path", "model", "effort", "phase", "tier")
TOKENS = ("input_tokens", "cached_input_tokens", "cache_write_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens")
UNKNOWN = "unknown"


def _time(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc) if parsed.tzinfo else None
    except ValueError:
        return None


def _count(value):
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def _agent_path(value):
    """Expose only Codex symbolic task paths, never filesystem paths."""
    if isinstance(value, str) and len(value) <= 512 and re.fullmatch(r"/root(?:/[a-z0-9_]+)*", value):
        return value
    return UNKNOWN


def price(response, rates=None):
    """Return two independent estimates; missing rate inputs never mean zero."""
    rates = rates or json.loads(Path(__file__).with_name("rates.json").read_text())
    tier = (response.get("tier") or "").lower()
    factors = {"standard": 1, "default": 1, "fast": 2, "priority": 2, "ultrafast": 6}
    result = {"estimated_credits": None, "api_equivalent_usd": None,
              "credit_status": "unknown_model", "api_status": "unknown_model",
              "credit_tier_basis": tier if tier in factors else "Standard assumed",
              "api_tier_basis": tier if tier in factors or tier in {"batch", "flex"} else "Standard assumed"}
    credit_factor = factors.get(tier, 1)
    api_factor = factors.get(tier, .5 if tier in {"batch", "flex"} else 1)
    model = response.get("model")
    inp, cached, out = (_count(response.get(k)) for k in ("input_tokens", "cached_input_tokens", "output_tokens"))
    valid = None not in (inp, cached, out) and cached <= inp
    if model in rates["credits_per_million"]:
        result["credit_status"] = "missing_or_invalid_usage"
        if valid:
            a, b, c = map(lambda x: Decimal(str(x)), rates["credits_per_million"][model])
            result["estimated_credits"] = float(((inp - cached) * a + cached * b + out * c) * Decimal(str(credit_factor)) / 1000000)
            result["credit_status"] = "priced"
    if model in rates["api_usd_per_million"]:
        result["api_status"] = "missing_or_invalid_usage"
        writes = _count(response.get("cache_write_input_tokens"))
        if tier == "ultrafast" and model == "gpt-6-luna":
            result["api_status"] = "unsupported_tier"
        elif valid and writes is not None and cached + writes <= inp:
            rate = {k: Decimal(str(v)) for k, v in rates["api_usd_per_million"][model].items() if k != "source"}
            long = rates["api_long_context"]
            im = Decimal(str(long["input_multiplier"])) if inp > long["input_threshold"] else Decimal(1)
            om = Decimal(str(long["output_multiplier"])) if inp > long["input_threshold"] else Decimal(1)
            result["api_equivalent_usd"] = float((im * ((inp - cached - writes) * rate["input"] + cached * rate["cached"] + writes * rate["write"]) + om * out * rate["output"]) * Decimal(str(api_factor)) / 1000000)
            result["api_status"] = "priced"
    return result


def aggregate(rows):
    """Known sums carry explicit missing counts; no complete-cost implication."""
    result = {"responses": len(rows)}
    for key in TOKENS + ("estimated_credits", "api_equivalent_usd"):
        values = [r[key] for r in rows if r.get(key) is not None]
        result[key] = sum(values) if values else None
        result[key + "_missing"] = len(rows) - len(values)
    result["unbound_responses"] = sum(r.get("change") == "unassigned" for r in rows)
    return result


def build(snapshot):
    """Derive a presentation-only snapshot; source text and paths are excluded."""
    rates = json.loads(Path(__file__).with_name("rates.json").read_text(encoding="utf-8"))
    threads = {t["thread_id"]: t for t in snapshot.get("threads", [])}
    projects = {p["project_id"]: p for p in snapshot.get("projects", [])}
    rows, invalid_times, invalid_zones = [], 0, set()
    seen, attributes = set(), {}
    for response in snapshot.get("responses", []):
        identity = (response.get("provider"), response.get("response_id"))
        if identity in seen:
            continue
        seen.add(identity)
        attr_key = (response.get("thread_id"), response.get("root_turn_id"), response.get("turn_id"))
        if attr_key not in attributes:
            attributes[attr_key] = attribute(snapshot, response)
        attr = attributes[attr_key]
        thread = threads.get(response.get("thread_id"), {})
        project = projects.get(response.get("project_id"), {})
        zone_name = project.get("timezone") or "Asia/Singapore"
        try:
            zone = ZoneInfo(zone_name)
        except (ZoneInfoNotFoundError, ValueError):
            # Windows Python may not bundle IANA data. Singapore has no DST.
            if zone_name == "Asia/Singapore":
                from datetime import timedelta
                zone = timezone(timedelta(hours=8))
            else:
                zone = timezone.utc
                invalid_zones.add(str(zone_name))
        stamp = _time(response.get("timestamp"))
        invalid_times += stamp is None
        row = {"project": response.get("project_id") or UNKNOWN,
               "day": stamp.astimezone(zone).date().isoformat() if stamp else UNKNOWN,
               "contributor": response.get("owner") or UNKNOWN,
               "change": attr.get("change_id") or "unassigned", "wp": attr.get("wp") or "unassigned",
               "agent": thread.get("role") or ("subagent" if thread.get("parent_thread_id") else UNKNOWN),
               "agent_path": _agent_path(thread.get("agent_path")),
               "model": response.get("model") or UNKNOWN, "effort": response.get("effort") or UNKNOWN,
               "tier": response.get("tier") or UNKNOWN, "phase": attr.get("phase") or "unassigned",
               "outcome": attr.get("outcome") or "unassigned",
               "response_id": response.get("response_id"), "thread_id": response.get("thread_id"),
               "root_thread_id": attr.get("root_thread_id"), "root_turn_id": response.get("root_turn_id"),
               "timestamp": stamp.isoformat() if stamp else None}
        row.update({k: _count(response.get(k)) for k in TOKENS})
        row.update(price(response, rates))
        rows.append(row)
    rollups = []
    for dimension in DIMENSIONS:
        groups = defaultdict(list)
        for row in rows:
            groups[row[dimension]].append(row)
        for value, group in sorted(groups.items()):
            rollups.append({"dimension": dimension, "value": value, **aggregate(group)})
    tasks = []
    grouped = defaultdict(list)
    for row in rows:
        if row["root_turn_id"]:
            grouped[(row["root_thread_id"], row["root_turn_id"])].append(row)
    annotations = {a.get("root_turn_id"): a for a in snapshot.get("annotations", [])}
    task_pairs = discover_root_tasks(snapshot) | set(grouped)
    for root, turn in sorted(task_pairs, key=str):
        group = grouped.get((root, turn), [])
        stamps = sorted(_time(r["timestamp"]) for r in group if _time(r["timestamp"]))
        start_value, end_value = root_task_bounds(snapshot, root, turn)
        start, end = _time(start_value), _time(end_value)
        annotation = annotations.get(turn, {})
        tasks.append({"root_thread_id": root, "root_turn_id": turn,
                      "phase": annotation.get("phase") or "unassigned",
                      "outcome": annotation.get("outcome") or "unassigned",
                      "usage_status": "observed" if group else "missing",
                      "task_elapsed_seconds": (end - start).total_seconds() if start and end and end >= start else None,
                      "observed_response_span_seconds": (stamps[-1] - stamps[0]).total_seconds() if stamps else None,
                      **aggregate(group)})
    lifecycle = []
    for thread in threads.values():
        start, end = _time(thread.get("started_at")), _time(thread.get("ended_at"))
        lifecycle.append({"thread_id": thread["thread_id"], "parent_thread_id": thread.get("parent_thread_id"),
                          "project": thread.get("project_id") or UNKNOWN,
                          "agent": thread.get("role") or UNKNOWN,
                          "agent_path": _agent_path(thread.get("agent_path")),
                          "completed_lifecycle_seconds": (end - start).total_seconds() if start and end and end >= start else None})
    spans = [t["completed_lifecycle_seconds"] for t in lifecycle if t["completed_lifecycle_seconds"] is not None]
    accepted = [t for t in tasks if t["outcome"] == "accepted"]
    complete_accepted = [t for t in accepted if t["usage_status"] == "observed" and not t["estimated_credits_missing"]]
    summary = aggregate(rows)
    summary.update({"threads": len(threads), "threads_without_responses": len(set(threads) - {r["thread_id"] for r in rows}),
                    "tasks": len(tasks), "tasks_without_responses": sum(t["usage_status"] == "missing" for t in tasks),
                    "accepted_tasks": len(accepted), "fully_credit_priced_accepted_tasks": len(complete_accepted),
                    "missing_task_elapsed_bounds": sum(t["task_elapsed_seconds"] is None for t in tasks),
                    "credits_per_fully_priced_accepted_task": sum(t["estimated_credits"] for t in complete_accepted) / len(complete_accepted) if complete_accepted else None,
                    "correction_estimated_credits": aggregate([r for r in rows if r["phase"] == "correction"])["estimated_credits"],
                    "summed_completed_agent_lifecycle_seconds": sum(spans) if spans else None,
                    "missing_agent_lifecycle_spans": len(lifecycle) - len(spans),
                    "invalid_timestamps": invalid_times, "timezone_fallbacks": len(invalid_zones)})
    successful = [_time(c.get("finished_at") or c.get("timestamp") or c.get("collected_at")) for c in snapshot.get("collections", []) if c.get("success", True)]
    successful = [t for t in successful if t]
    latest = {}
    for collection in snapshot.get("collections", []) + snapshot.get("diagnostics", []):
        key = (collection.get("owner"), collection.get("machine_id"))
        stamp = _time(collection.get("collected_at"))
        if stamp and (key not in latest or stamp > latest[key]):
            latest[key] = stamp
    counts = defaultdict(int)
    for diagnostic in snapshot.get("diagnostics", []):
        key = (diagnostic.get("owner"), diagnostic.get("machine_id"))
        if key in latest and _time(diagnostic.get("collected_at")) != latest[key]:
            continue
        count = _count(diagnostic.get("count", 1))
        if count is not None:
            counts[diagnostic.get("code") or UNKNOWN] += count
    diagnostics = [{"code": code, "count": count} for code, count in sorted(counts.items())]
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "last_collection": max(successful).isoformat() if successful else None,
            "rates": rates, "summary": summary, "responses": rows, "rollups": rollups,
            "tasks": tasks, "threads": lifecycle, "diagnostics": diagnostics}


def _safe_cell(value):
    if isinstance(value, str) and (value.startswith(("\t", "\r", "\n")) or value.lstrip().startswith(("=", "+", "-", "@"))):
        return "'" + value
    return value


def _write(path, writer):
    fd, name = tempfile.mkstemp(prefix=".report-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            writer(handle)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def generate(snapshot, output):
    """Write standalone HTML and dimension/response/task/lifecycle CSV files."""
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    data = build(snapshot)
    encoded = json.dumps(data, ensure_ascii=True, allow_nan=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    html = Path(__file__).with_name("report.html").read_text(encoding="utf-8").replace("__REPORT_DATA__", encoded)
    html_path = output / "index.html"
    _write(html_path, lambda f: f.write(html))
    paths = {"html": str(html_path)}
    for name in ("rollups", "responses", "tasks", "threads"):
        path = output / (name + ".csv")
        rows = data[name]
        fields = list(rows[0]) if rows else {"rollups": ["dimension", "value", "responses"], "responses": list(DIMENSIONS) + list(TOKENS), "tasks": ["root_thread_id", "root_turn_id", "phase", "outcome", "usage_status", "responses", "task_elapsed_seconds", "observed_response_span_seconds"], "threads": ["thread_id", "agent", "agent_path", "completed_lifecycle_seconds"]}[name]
        def write_csv(f, rows=rows, fields=fields):
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows({k: _safe_cell(v) for k, v in row.items()} for row in rows)
        _write(path, write_csv)
        paths[name] = str(path)
    return {"paths": paths, "totals": data["summary"], "rate_card_version": data["rates"]["version"]}

"""Read Codex's version-sensitive local JSONL without retaining conversation text."""
import hashlib
import json
import os
from collections import Counter
from pathlib import Path

from .common import now, registry
from .store import FIELDS, Ledger, canonical, instant

TOKENS = ('input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens')


def _text(value):
    return value if isinstance(value, str) else None


def _header(path):
    with path.open('rb') as handle:
        for _ in range(256):
            line = handle.readline()
            if not line:
                break
            try:
                record = json.loads(line)
            except (ValueError, UnicodeDecodeError):
                continue
            if not isinstance(record, dict):
                continue
            if record.get('type') == 'session_meta' and isinstance(record.get('payload'), dict):
                p = record['payload']
                source = p.get('source') if isinstance(p.get('source'), dict) else {}
                subagent = source.get('subagent', {})
                subagent = subagent if isinstance(subagent, dict) else {}
                spawn = subagent.get('thread_spawn', {})
                spawn = spawn if isinstance(spawn, dict) else {}
                git = p.get('git') if isinstance(p.get('git'), dict) else {}
                return dict(thread_id=_text(p.get('id')), parent_thread_id=_text(p.get('parent_thread_id')) or _text(spawn.get('parent_thread_id')), role=_text(p.get('agent_role')) or _text(spawn.get('agent_role')) or ('approval_review' if subagent.get('other') == 'guardian' else ('subagent' if subagent else 'root')), agent_path=_text(p.get('agent_path')) or _text(spawn.get('agent_path')), started_at=_text(p.get('timestamp')) or _text(record.get('timestamp')), ended_at=None, cli_version=_text(p.get('cli_version')), source_revision=_text(git.get('commit_hash')), provider=_text(p.get('model_provider')) or 'unknown', cwd=_text(p.get('cwd')), roots=p.get('runtime_workspace_roots', []))
    return None


def _project(meta, projects):
    candidates = [meta.get('cwd')] + (meta.get('roots') if isinstance(meta.get('roots'), list) else [])
    for project in projects:
        for root in project.get('roots', []):
            for candidate in candidates:
                if isinstance(candidate, str):
                    try:
                        Path(candidate).resolve().relative_to(Path(root).resolve())
                        return project['project_id']
                    except ValueError:
                        pass
    return None


def _anchor(handle, offset):
    handle.seek(max(0, offset - 512))
    return hashlib.sha256(handle.read(min(512, offset))).hexdigest()


def collect(state, full=False):
    config = registry(state)
    ledger = Ledger(state)
    home = Path(config['codex_home']).expanduser()
    files = sorted(set(home.glob('sessions/**/*.jsonl')) | set(home.glob('archived_sessions/**/*.jsonl')))
    entries, counters = [], Counter()
    for path in files:
        try:
            meta = _header(path)
        except OSError:
            counters['unreadable_session'] += 1
            continue
        if meta and meta['thread_id']:
            entries.append((path, meta))
        else:
            counters['missing_session_metadata'] += 1
    selected = {}
    for _, meta in entries:
        project = _project(meta, config['projects'])
        if project:
            selected[meta['thread_id']] = project
    # Discover descendants transitively, regardless of their working directory.
    known = ledger.snapshot()['threads']
    selected.update({t['thread_id']: t['project_id'] for t in known if t['owner'] == config['owner']})
    changed = True
    while changed:
        changed = False
        for _, meta in entries:
            parent = selected.get(meta['parent_thread_id'])
            if parent and meta['thread_id'] not in selected:
                selected[meta['thread_id']] = parent
                changed = True
    inserted = 0
    with ledger.transaction() as db:
        for path, meta in entries:
            thread_id = meta['thread_id']
            if thread_id not in selected:
                continue
            thread = {k: meta.get(k) for k in FIELDS['threads']}
            thread.update(project_id=selected[thread_id], owner=config['owner'])
            try:
                ledger.put(db, 'threads', thread, enrich=True)
            except ValueError:
                counters['conflicting_thread_metadata'] += 1
                continue
            saved = db.execute('SELECT data FROM checkpoints WHERE path=?', (str(path),)).fetchone()
            cp = json.loads(saved[0]) if saved else {}
            try:
                with path.open('rb') as handle:
                    offset = cp.get('offset', 0)
                    stat = os.fstat(handle.fileno())
                    if full or offset > stat.st_size or cp.get('inode') != stat.st_ino or (stat.st_size == offset and cp.get('mtime_ns') != stat.st_mtime_ns) or (offset and cp.get('anchor') != _anchor(handle, offset)):
                        cp, offset = {}, 0
                    handle.seek(offset)
                    stats = Counter(cp.get('stats', {}))
                    aggregate = cp.get('aggregate')
                    while True:
                        position = handle.tell()
                        line = handle.readline()
                        if not line or not line.endswith(b'\n'):
                            handle.seek(position)
                            break
                        try:
                            record = json.loads(line)
                        except (ValueError, UnicodeDecodeError):
                            stats['malformed_record'] += 1
                            continue
                        if not isinstance(record, dict):
                            stats['malformed_record'] += 1
                            continue
                        p = record.get('payload', {})
                        if not isinstance(p, dict):
                            continue
                        timestamp = _text(record.get('timestamp'))
                        if record.get('type') == 'turn_context' and _text(p.get('turn_id')):
                            turn = dict(turn_id=p['turn_id'], thread_id=thread_id, root_turn_id=_text(p.get('root_turn_id')), started_at=timestamp, model=_text(p.get('model')), effort=_text(p.get('effort')) or _text(p.get('reasoning_effort')), tier=_text(p.get('service_tier')) or _text(p.get('tier')))
                            # Forks contain historical contexts. Own usage is resolved by turn/thread key.
                            try:
                                ledger.put(db, 'turns', turn, enrich=True)
                            except ValueError:
                                stats['conflicting_turn_metadata'] += 1
                        elif record.get('type') == 'token_usage_record':
                            # Inherited fork records still carry the originating thread ID.
                            if p.get('thread_id') != thread_id:
                                stats['inherited_usage_skipped' if p.get('thread_id') else 'unsupported_usage'] += 1
                                continue
                            usage = p.get('usage')
                            if not isinstance(usage, dict) or not _text(p.get('response_id')):
                                stats['unsupported_usage'] += 1
                                continue
                            if any(v is not None and (type(v) is not int or v < 0) for k, v in usage.items() if k in TOKENS):
                                stats['invalid_usage'] += 1
                                continue
                            if not any(type(usage.get(k)) is int for k in TOKENS):
                                stats['unsupported_usage'] += 1
                                continue
                            turn_id = _text(p.get('turn_id'))
                            found = db.execute('SELECT data FROM turns WHERE key=?', (canonical([thread_id, turn_id]),)).fetchone()
                            context = json.loads(found[0]) if found else {}
                            response = dict(provider=_text(p.get('model_provider')) or meta['provider'], response_id=p['response_id'], project_id=selected[thread_id], owner=config['owner'], thread_id=thread_id, turn_id=turn_id, root_turn_id=_text(p.get('root_turn_id')) or context.get('root_turn_id'), timestamp=timestamp, model=context.get('model'), effort=context.get('effort'), tier=context.get('tier'))
                            response.update({k: usage.get(k) for k in TOKENS})
                            try:
                                inserted += ledger.put(db, 'responses', response, enrich=True)
                            except ValueError:
                                stats['conflicting_response_facts'] += 1
                            if isinstance(p.get('thread_token_usage'), dict):
                                aggregate = {k: p['thread_token_usage'].get(k) for k in TOKENS}
                        elif record.get('type') == 'event_msg':
                            if p.get('type') == 'token_count':
                                stats['legacy_cumulative_usage'] += 1
                            elif isinstance(p.get('type'), str) and p['type'] in {'task_started', 'task_complete'} and _text(p.get('turn_id')) and instant(timestamp):
                                # Fork history predates the child creation; do not reattribute it.
                                if instant(meta['started_at']) and instant(timestamp) < instant(meta['started_at']):
                                    continue
                                event = _observation('TaskStart' if p['type'] == 'task_started' else 'TaskEnd', thread, timestamp, p['turn_id'], _text(p.get('root_turn_id')))
                                ledger.put(db, 'lifecycles', event)
                    offset = handle.tell()
                    checkpoint = dict(offset=offset, inode=stat.st_ino, mtime_ns=stat.st_mtime_ns, anchor=_anchor(handle, offset), stats=dict(stats), aggregate=aggregate, thread_id=thread_id)
                    db.execute('INSERT OR REPLACE INTO checkpoints VALUES (?,?)', (str(path), canonical(checkpoint)))
                    if thread['ended_at']:
                        ledger.put(db, 'threads', thread, enrich=True)
            except OSError:
                counters['unreadable_session'] += 1
        # Recompute coverage from current checkpoints, not every repeated scan.
        checkpoints = [json.loads(r[0]) for r in db.execute('SELECT data FROM checkpoints')]
        per_thread = {}
        for cp in checkpoints:
            # Archive copies and repeated paths must not multiply diagnostics.
            previous = per_thread.get(cp['thread_id'])
            if previous is None or cp.get('mtime_ns', 0) > previous.get('mtime_ns', 0):
                per_thread[cp['thread_id']] = cp
        responses = [json.loads(r[0]) for r in db.execute('SELECT data FROM responses')]
        # A complete context can arrive after its usage record or a delayed file write.
        for response in responses:
            context_row = db.execute('SELECT data FROM turns WHERE key=?', (canonical([response['thread_id'], response['turn_id']]),)).fetchone()
            if context_row:
                context = json.loads(context_row[0])
                for field in ('model', 'effort', 'tier', 'root_turn_id'):
                    if response.get(field) is None:
                        response[field] = context.get(field)
                ledger.put(db, 'responses', response, enrich=True)
        for tid in selected:
            own = [r for r in responses if r['thread_id'] == tid]
            if not own:
                counters['sessions_without_response_usage'] += 1
            cp = per_thread.get(tid, {})
            counters.update(cp.get('stats', {}))
            aggregate = cp.get('aggregate')
            if aggregate and own and all(type(aggregate.get(k)) is int and all(type(r.get(k)) is int for r in own) for k in ('input_tokens', 'output_tokens')):
                if any(sum(r[k] for r in own) != aggregate[k] for k in ('input_tokens', 'output_tokens')):
                    counters['cumulative_reconciliation_mismatch'] += 1
        timestamp = now()
        source = dict(owner=config['owner'], machine_id=config['machine_id'], collected_at=timestamp)
        for code, count in sorted(counters.items()):
            ledger.put(db, 'diagnostics', dict(code=code, count=count, **source))
        ledger.put(db, 'collections', source)
    return dict(inserted_responses=inserted, sessions=len(selected), collected_at=timestamp, diagnostics=dict(counters))



def _observation(name, thread, timestamp, turn_id=None, root_turn_id=None):
    event = dict(event_name=name, project_id=thread['project_id'], owner=thread['owner'], thread_id=thread['thread_id'], parent_thread_id=thread.get('parent_thread_id'), turn_id=turn_id, root_turn_id=root_turn_id, timestamp=timestamp)
    event['event_id'] = hashlib.sha256(canonical(event).encode()).hexdigest()
    return event


def process_events(state, events):
    """Persist queue metadata; return identifiers safe to acknowledge after success.

    ``events`` maps queue filenames to decoded event dictionaries. Rejected and
    currently unavailable observations stay queued; this function deletes nothing.
    """
    if not isinstance(events, dict):
        raise ValueError('Lifecycle input must map queue names to events')
    config = registry(state)
    ledger = Ledger(state)
    consumed, pending, rejected = [], [], []
    allowed = {'version', 'project_id', 'event', 'session_id', 'time', 'agent_id', 'agent_type', 'turn_id'}
    supported = {'SessionStart', 'SessionEnd', 'SubagentStart', 'SubagentStop', 'Stop', 'Interrupt'}
    projects = {p['project_id'] for p in config['projects']}
    with ledger.transaction() as db:
        threads = {t['thread_id']: t for t in (json.loads(r[0]) for r in db.execute('SELECT data FROM threads'))}
        for name, event in events.items():
            if not isinstance(event, dict) or set(event) - allowed or type(event.get('version')) is not int or event.get('version') != 1 or not isinstance(event.get('event'), str) or event['event'] not in supported or not isinstance(event.get('project_id'), str) or event['project_id'] not in projects or not _text(event.get('session_id')) or not instant(event.get('time')):
                rejected.append(name)
                continue
            if any(key in event and not _text(event[key]) for key in ('agent_id', 'agent_type', 'turn_id')):
                rejected.append(name)
                continue
            child_event = event['event'] in {'SubagentStart', 'SubagentStop'}
            target = event.get('agent_id') if child_event else event['session_id']
            if child_event and not target:
                rejected.append(name)
                continue
            thread = threads.get(target)
            parent = threads.get(event['session_id']) if child_event else None
            if thread is None or (child_event and parent is None):
                pending.append(name)
                continue
            if thread['owner'] != config['owner'] or thread['project_id'] != event['project_id'] or (parent is not None and (parent['project_id'] != thread['project_id'] or parent['owner'] != thread['owner'])):
                rejected.append(name)
                continue
            if child_event:
                ancestor, seen = event['session_id'], set()
                while ancestor in threads and ancestor not in seen and ancestor != target:
                    seen.add(ancestor)
                    ancestor = threads[ancestor]['parent_thread_id']
                if ancestor == target or ancestor in seen:
                    rejected.append(name)
                    continue
                if thread['parent_thread_id'] not in (None, event['session_id']):
                    rejected.append(name)
                    continue
                if thread['parent_thread_id'] is None:
                    thread = dict(thread, parent_thread_id=event['session_id'])
                    ledger.put(db, 'threads', thread, enrich=True)
                    threads[target] = thread
            turn_id = event.get('turn_id')
            root_turn_id = None
            if turn_id:
                row = db.execute('SELECT data FROM turns WHERE key=?', (canonical([target, turn_id]),)).fetchone()
                root_turn_id = json.loads(row[0]).get('root_turn_id') if row else None
            observation = _observation(event['event'], thread, event['time'], turn_id, root_turn_id)
            ledger.put(db, 'lifecycles', observation)
            consumed.append(name)
    return dict(consumed=consumed, pending=pending, rejected=rejected)

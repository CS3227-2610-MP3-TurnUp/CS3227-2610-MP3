"""Transactional local usage ledger. JSON rows keep the exchange schema explicit."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from .common import now, registry
from .privacy import ensure_private_ledger

FIELDS = {
    'projects': ('project_id', 'name', 'timezone'),
    'threads': ('thread_id', 'parent_thread_id', 'project_id', 'owner', 'role', 'agent_path', 'started_at', 'ended_at', 'cli_version', 'source_revision'),
    'responses': ('provider', 'response_id', 'project_id', 'owner', 'thread_id', 'turn_id', 'root_turn_id', 'timestamp', 'model', 'effort', 'tier', 'input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'),
    'turns': ('turn_id', 'thread_id', 'root_turn_id', 'started_at', 'model', 'effort', 'tier'),
    'bindings': ('thread_id', 'change_id', 'wp', 'from_turn'),
    'annotations': ('root_turn_id', 'phase', 'outcome', 'evidence'),
    'diagnostics': ('code', 'count', 'owner', 'machine_id', 'collected_at'),
    'collections': ('collected_at', 'owner', 'machine_id'),
    'lifecycles': ('event_id', 'event_name', 'project_id', 'owner', 'thread_id', 'parent_thread_id', 'turn_id', 'root_turn_id', 'timestamp'),
}
KEYS = {'projects': ('project_id',), 'threads': ('thread_id',), 'responses': ('provider', 'response_id'), 'turns': ('thread_id', 'turn_id'), 'bindings': ('thread_id', 'from_turn'), 'annotations': ('root_turn_id',), 'diagnostics': ('owner', 'machine_id', 'collected_at', 'code'), 'collections': ('owner', 'machine_id', 'collected_at'), 'lifecycles': ('event_id',)}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True)


def row_key(table, row):
    return canonical([row.get(k) for k in KEYS[table]])


class Ledger:
    def __init__(self, state):
        self.state = Path(state).expanduser()
        self.path = ensure_private_ledger(self.state, self.state / 'ledger.sqlite3')
        self.state = self.path.parent
        with self.transaction() as db:
            for table in FIELDS:
                db.execute(f'CREATE TABLE IF NOT EXISTS {table} (key TEXT PRIMARY KEY, data TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS checkpoints (path TEXT PRIMARY KEY, data TEXT NOT NULL)')
            if (self.state / 'registry.json').exists():
                for project in registry(self.state)['projects']:
                    self.put(db, 'projects', {k: project.get(k) for k in FIELDS['projects']}, enrich=True)

    @contextmanager
    def transaction(self):
        self.path = ensure_private_ledger(self.state, self.path)
        db = sqlite3.connect(self.path, timeout=30)
        try:
            db.execute('PRAGMA busy_timeout=30000')
            db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def put(db, table, row, *, enrich=False, replace=False):
        row = {field: row.get(field) for field in FIELDS[table]}
        key = row_key(table, row)
        previous = db.execute(f'SELECT data FROM {table} WHERE key=?', (key,)).fetchone()
        if previous:
            old = json.loads(previous[0])
            if old == row:
                return False
            if enrich:
                for field in row:
                    if old[field] is not None and row[field] is not None and old[field] != row[field]:
                        raise ValueError(f'Conflicting {table} facts')
                row = {field: old[field] if old[field] is not None else row[field] for field in row}
                if row == old:
                    return False
            elif not replace:
                raise ValueError(f'Conflicting {table} facts')
        db.execute(f'INSERT OR REPLACE INTO {table} VALUES (?,?)', (key, canonical(row)))
        return previous is None

    def snapshot(self, raw=False):
        with self.transaction() as db:
            snapshot = {table: [json.loads(row[0]) for row in db.execute(f'SELECT data FROM {table} ORDER BY key')] for table in FIELDS}
        return snapshot if raw else observed_lifecycles(snapshot)

    def bind(self, thread_id, change_id, wp=None, from_turn=None):
        snap = self.snapshot()
        if thread_id not in {t['thread_id'] for t in snap['threads']}:
            raise ValueError('Unknown thread; collect or import it first')
        if from_turn is not None and not any(t['thread_id'] == thread_id and t['turn_id'] == from_turn for t in snap['turns']):
            raise ValueError('Unknown turn for this thread')
        if not change_id or not isinstance(change_id, str):
            raise ValueError('A change ID is required')
        with self.transaction() as db:
            self.put(db, 'bindings', dict(thread_id=thread_id, change_id=change_id, wp=wp, from_turn=from_turn), replace=True)

    def annotate(self, root_turn_id, phase, outcome, evidence):
        if phase not in {'planning', 'implementation', 'review', 'correction', 'delivery', 'other'}:
            raise ValueError('Invalid phase')
        if outcome not in {'accepted', 'needs_changes', 'abandoned'}:
            raise ValueError('Invalid outcome')
        if not isinstance(evidence, str) or len(evidence) > 2000:
            raise ValueError('Evidence must be text of at most 2000 characters')
        if not isinstance(root_turn_id, str) or not root_turn_id or root_turn_id not in {turn for _, turn in discover_root_tasks(self.snapshot())}:
            raise ValueError('Unknown root turn')
        with self.transaction() as db:
            self.put(db, 'annotations', dict(root_turn_id=root_turn_id, phase=phase, outcome=outcome, evidence=evidence), replace=True)


def attribute(snapshot, response):
    """Resolve nearest ancestry binding using actual root-turn start boundaries."""
    threads = {t['thread_id']: t for t in snapshot.get('threads', [])}
    chain, seen = [], set()
    current = response.get('thread_id')
    while current and current not in seen:
        seen.add(current)
        chain.append(current)
        current = threads.get(current, {}).get('parent_thread_id')
    root = chain[-1] if chain else None
    turns = snapshot.get('turns', [])
    root_turn = response.get('root_turn_id')
    root_start = next((t['started_at'] for t in turns if t['thread_id'] == root and t['turn_id'] == root_turn), None)
    starts = {(t['thread_id'], t['turn_id']): t['started_at'] for t in turns}
    selected = None
    for thread in chain:
        point = root_start
        if thread != root:
            if thread == response.get('thread_id'):
                point = starts.get((thread, response.get('turn_id')))
            else:
                # A nested child inherits the latest ancestor task within its root turn.
                ancestor_turns = [t['started_at'] for t in turns if t['thread_id'] == thread and t['root_turn_id'] == root_turn and t['started_at'] and response.get('timestamp') and t['started_at'] <= response['timestamp']]
                point = max(ancestor_turns, default=None)
        candidates = []
        for b in snapshot.get('bindings', []):
            if b['thread_id'] != thread:
                continue
            boundary = starts.get((thread, b['from_turn'])) if b['from_turn'] else ''
            if b['from_turn'] is None or (boundary and point and boundary <= point):
                candidates.append((boundary or '', b))
        if candidates:
            selected = max(candidates, key=lambda pair: pair[0])[1]
            break
    annotation = next((a for a in snapshot.get('annotations', []) if a['root_turn_id'] == root_turn), {})
    return dict(change_id=(selected or {}).get('change_id'), wp=(selected or {}).get('wp'), root_thread_id=root, root_turn_started_at=root_start, phase=annotation.get('phase'), outcome=annotation.get('outcome'), evidence=annotation.get('evidence'))


def discover_root_tasks(snapshot):
    """Return evidenced (root thread, root turn) pairs for annotation and reports.

    Response-derived tasks retain their established ancestry attribution. Turn and
    lifecycle-only evidence qualifies only when its own thread is a known root
    thread; child turns and threads with unresolved parents cannot create roots.
    """
    tasks = set()
    for response in snapshot.get('responses', []):
        turn_id = response.get('root_turn_id')
        if isinstance(turn_id, str) and turn_id:
            root_thread = attribute(snapshot, response).get('root_thread_id')
            tasks.add((root_thread, turn_id))

    root_threads = {
        thread.get('thread_id')
        for thread in snapshot.get('threads', [])
        if isinstance(thread.get('thread_id'), str) and thread.get('thread_id')
        and thread.get('parent_thread_id') is None
    }
    for turn in snapshot.get('turns', []):
        thread_id = turn.get('thread_id')
        turn_id = turn.get('root_turn_id') or turn.get('turn_id')
        if thread_id in root_threads and isinstance(turn_id, str) and turn_id:
            tasks.add((thread_id, turn_id))

    turn_lifecycle_events = {'TaskStart', 'TaskEnd', 'Stop', 'Interrupt'}
    for event in snapshot.get('lifecycles', []):
        thread_id = event.get('thread_id')
        turn_id = event.get('root_turn_id') or event.get('turn_id')
        if (thread_id in root_threads and event.get('event_name') in turn_lifecycle_events
                and isinstance(turn_id, str) and turn_id):
            tasks.add((thread_id, turn_id))
    return tasks


def root_task_bounds(snapshot, root_thread_id, root_turn_id):
    """Return observed start/end for a root task, including lifecycle-only tasks."""
    matching_turns = [
        turn for turn in snapshot.get('turns', [])
        if turn.get('thread_id') == root_thread_id
        and (turn.get('root_turn_id') or turn.get('turn_id')) == root_turn_id
    ]
    starts = [turn.get('started_at') for turn in matching_turns]
    ends = [turn.get('ended_at') for turn in matching_turns]
    for event in snapshot.get('lifecycles', []):
        if event.get('thread_id') != root_thread_id:
            continue
        if (event.get('root_turn_id') or event.get('turn_id')) != root_turn_id:
            continue
        if event.get('event_name') == 'TaskStart':
            starts.append(event.get('timestamp'))
        elif event.get('event_name') in {'TaskEnd', 'Stop', 'Interrupt'}:
            ends.append(event.get('timestamp'))
    valid_starts = [value for value in starts if instant(value)]
    valid_ends = [value for value in ends if instant(value)]
    start = min(valid_starts, key=instant, default=None)
    end = max(valid_ends, key=instant, default=None)
    latest_start = max(valid_starts, key=instant, default=None)
    if end and latest_start and instant(end) < instant(latest_start):
        end = None
    return start, end


def instant(value):
    """Return a timezone-aware observation instant, or None for invalid input."""
    if not isinstance(value, str):
        return None
    try:
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return stamp if stamp.tzinfo is not None else None
    except ValueError:
        return None


def observed_lifecycles(snapshot):
    """Derive observed elapsed bounds. Gaps/resumes are not active execution time."""
    events = snapshot.get('lifecycles', [])
    for thread in snapshot['threads']:
        own = [e for e in events if e['thread_id'] == thread['thread_id']]
        starts = [e['timestamp'] for e in own if e['event_name'] in {'SessionStart', 'SubagentStart'} and instant(e['timestamp'])]
        if instant(thread.get('started_at')):
            starts.append(thread['started_at'])
        thread['started_at'] = min(starts, key=instant, default=None)
        ends = [e['timestamp'] for e in own if e['event_name'] in {'SessionEnd', 'SubagentStop'} and instant(e['timestamp'])]
        end = max(ends, key=instant, default=None)
        latest_start = max(starts, key=instant, default=None)
        thread['ended_at'] = end if end and (latest_start is None or instant(end) >= instant(latest_start)) else None
    for turn in snapshot['turns']:
        own = [e for e in events if e['thread_id'] == turn['thread_id'] and e['turn_id'] == turn['turn_id']]
        starts = [e['timestamp'] for e in own if e['event_name'] == 'TaskStart' and instant(e['timestamp'])]
        if instant(turn.get('started_at')):
            starts.append(turn['started_at'])
        turn['started_at'] = min(starts, key=instant, default=None)
        ends = [e['timestamp'] for e in own if e['event_name'] in {'TaskEnd', 'Stop', 'Interrupt'} and instant(e['timestamp'])]
        end = max(ends, key=instant, default=None)
        latest_start = max(starts, key=instant, default=None)
        turn['ended_at'] = end if end and (latest_start is None or instant(end) >= instant(latest_start)) else None
    return snapshot

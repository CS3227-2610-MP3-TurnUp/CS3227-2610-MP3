"""Versioned allowlisted JSONL exchange. Never export transcripts or registry paths."""
import json
import os
import re
import tempfile
from pathlib import Path

from .store import FIELDS, KEYS, Ledger, canonical

VERSION = 1
_URL = re.compile(r'https://[^\s<>\"\']+')
_FILE_URI = re.compile(r'''(?i)(?<![\w.+-])file:[^\s<>"']+''')
_LOCAL = re.compile(r'(?<![\w:/])(?:[A-Za-z]:[\\/][^\s<>\"\']*|\\\\[^\s<>\"\']+|/(?!/)[^\s<>\"\']+)')


def _redact(value):
    if not isinstance(value, str):
        return value
    # Protect explicitly entered HTTPS evidence while removing local paths.
    urls = []
    def save(match):
        urls.append(match.group())
        return f'URLPLACEHOLDER{len(urls)-1}END'
    text = _URL.sub(save, value)
    text = _FILE_URI.sub('[local-path]', text)
    text = _LOCAL.sub('[local-path]', text)
    for index, url in enumerate(urls):
        text = text.replace(f'URLPLACEHOLDER{index}END', url)
    return text


def _validate(table, row):
    if not isinstance(row, dict) or set(row) != set(FIELDS[table]):
        raise ValueError(f'Unsupported fields in {table}')
    for field, value in row.items():
        number = field.endswith('_tokens') or (table == 'diagnostics' and field == 'count')
        if number:
            if value is not None and (type(value) is not int or value < 0):
                raise ValueError(f'Invalid numeric field in {table}')
        elif value is not None and (not isinstance(value, str) or len(value) > 2000):
            raise ValueError(f'Invalid text field in {table}')
        elif isinstance(value, str):
            if field == 'agent_path':
                if not re.fullmatch(r'/root(?:/[A-Za-z0-9_-]+)*', value):
                    raise ValueError('Agent path must be a symbolic /root path')
            elif _redact(value) != value:
                raise ValueError(f'Local path prohibited in {table}.{field}')
    for field in KEYS[table]:
        if field != 'from_turn' and not row.get(field):
            raise ValueError(f'Missing identity in {table}')
    if table in {'threads', 'responses', 'diagnostics', 'collections', 'lifecycles'} and row.get('owner') not in {'keith', 'darryl'}:
        raise ValueError('Invalid contributor identity')
    if table == 'lifecycles':
        from .store import instant
        if row['event_name'] not in {'SessionStart', 'SessionEnd', 'SubagentStart', 'SubagentStop', 'Stop', 'Interrupt', 'TaskStart', 'TaskEnd'} or not instant(row['timestamp']):
            raise ValueError('Invalid lifecycle observation')
    if table == 'annotations':
        if row['phase'] not in {'planning', 'implementation', 'review', 'correction', 'delivery', 'other'} or row['outcome'] not in {'accepted', 'needs_changes', 'abandoned'}:
            raise ValueError('Invalid annotation')
    if table == 'responses':
        if not row.get('project_id') or not row.get('thread_id'):
            raise ValueError('Response lacks project/thread identity')
        for subset, total in [('cached_input_tokens', 'input_tokens'), ('cache_write_input_tokens', 'input_tokens'), ('reasoning_output_tokens', 'output_tokens')]:
            if row[subset] is not None and row[total] is not None and row[subset] > row[total]:
                raise ValueError('Invalid token subset')


def export_data(state, output):
    snapshot = Ledger(state).snapshot(raw=True)
    records = []
    for table in FIELDS:
        for row in snapshot[table]:
            row = {k: row.get(k) for k in FIELDS[table]}
            for field in row:
                if field != 'agent_path':
                    row[field] = _redact(row[field])
            _validate(table, row)
            records.append(dict(type=table, data=row))
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix='.export-', dir=path.parent)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8') as handle:
            handle.write(canonical(dict(type='header', version=VERSION)) + '\n')
            for record in records:
                handle.write(canonical(record) + '\n')
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return dict(records=len(records), output=str(path))


def import_data(state, paths):
    records = []
    for path in paths:
        with Path(path).open(encoding='utf-8') as handle:
            try:
                header = json.loads(next(handle))
            except (StopIteration, ValueError):
                raise ValueError('Missing exchange header') from None
            if not isinstance(header, dict) or type(header.get('version')) is not int or header != dict(type='header', version=VERSION):
                raise ValueError('Unsupported exchange version or header fields')
            for line in handle:
                try:
                    record = json.loads(line)
                except ValueError:
                    raise ValueError('Malformed exchange record') from None
                if not isinstance(record, dict) or set(record) != {'type', 'data'} or not isinstance(record['type'], str) or record['type'] not in FIELDS:
                    raise ValueError('Unsupported exchange record')
                _validate(record['type'], record['data'])
                records.append(record)
    ledger = Ledger(state)
    inserted = 0
    with ledger.transaction() as db:
        for record in records:
            inserted += ledger.put(db, record['type'], record['data'], enrich=record['type'] in {'responses', 'threads', 'turns'})
        projects = {json.loads(r[0])['project_id'] for r in db.execute('SELECT data FROM projects')}
        threads = {t['thread_id']: t for t in (json.loads(r[0]) for r in db.execute('SELECT data FROM threads'))}
        for thread in threads.values():
            if thread['project_id'] not in projects:
                raise ValueError('Thread refers to an unknown project')
            # Unknown ancestors are valid partial coverage; known cycles are not.
            seen = set()
            current = thread['thread_id']
            while current in threads:
                if current in seen:
                    raise ValueError('Thread parent graph contains a cycle')
                seen.add(current)
                current = threads[current]['parent_thread_id']
        for item in db.execute('SELECT data FROM lifecycles'):
            event = json.loads(item[0])
            thread = threads.get(event['thread_id'])
            if not thread or thread['owner'] != event['owner'] or thread['project_id'] != event['project_id']:
                raise ValueError('Lifecycle attribution conflicts with its thread')
        for item in db.execute('SELECT data FROM responses'):
            response = json.loads(item[0])
            thread = threads.get(response['thread_id'])
            if not thread or thread['owner'] != response['owner'] or thread['project_id'] != response['project_id']:
                raise ValueError('Response attribution conflicts with its thread')
    return dict(inserted_records=inserted, processed_records=len(records))

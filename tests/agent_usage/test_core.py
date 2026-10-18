"""Synthetic accounting fixtures; never read a contributor's real transcripts."""
import json
import re
import tempfile
import unittest
from pathlib import Path

from tools.agent_usage.collector import collect, process_events
from tools.agent_usage.common import atomic_json
from tools.agent_usage.exchange import export_data, import_data
from tools.agent_usage.store import Ledger, attribute, discover_root_tasks, root_task_bounds


class CoreTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.state = self.root / 'state'
        self.home = self.root / 'codex'
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.state.mkdir()
        atomic_json(self.state / 'registry.json', dict(version=1, owner='keith', machine_id='m1', codex_home=str(self.home), projects=[dict(project_id='turnup', name='TurnUp', timezone='Asia/Singapore', roots=[str(self.repo)])]))

    def record(self, kind, payload, stamp='2026-10-18T01:00:00Z'):
        return dict(type=kind, timestamp=stamp, payload=payload)

    def meta(self, tid, parent=None, cwd=None, source=None):
        return self.record('session_meta', dict(id=tid, parent_thread_id=parent, cwd=str(cwd or self.repo), model_provider='openai', cli_version='0.test', source=source or 'vscode', timestamp='2026-10-18T00:00:00Z', git=dict(commit_hash='abc123')))

    def turn(self, turn='t1', root=None, model='model-a', effort='high', stamp='2026-10-18T01:00:00Z'):
        return self.record('turn_context', dict(turn_id=turn, root_turn_id=root or turn, model=model, effort=effort), stamp)

    def usage(self, tid='root', turn='t1', root=None, response='r1', tokens=100):
        usage = dict(input_tokens=tokens, cached_input_tokens=50, cache_write_input_tokens=0, output_tokens=20, reasoning_output_tokens=5, total_tokens=tokens+20)
        return self.record('token_usage_record', dict(thread_id=tid, turn_id=turn, root_turn_id=root or turn, response_id=response, usage=usage, turn_token_usage={k: v * 10 for k, v in usage.items()}, thread_token_usage=usage))

    def write(self, name, records, mode='w'):
        path = self.home / 'sessions' / f'{name}.jsonl'
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open(mode) as handle:
            for record in records:
                handle.write(json.dumps(record) + '\n')
        return path

    def snap(self):
        return Ledger(self.state).snapshot()

    def test_usage_incremental_not_cumulative_and_metadata(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        self.assertEqual(collect(self.state)['inserted_responses'], 1)
        self.assertEqual(collect(self.state)['inserted_responses'], 0)
        response = self.snap()['responses'][0]
        self.assertEqual(response['input_tokens'], 100)
        self.assertEqual(response['reasoning_output_tokens'], 5)
        self.assertEqual(response['model'], 'model-a')
        self.assertEqual(response['effort'], 'high')
        self.assertEqual(collect(self.state, full=True)['inserted_responses'], 0)

    def test_fork_history_and_nested_children_outside_cwd(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        self.write('child', [self.meta('child', 'root', '/elsewhere'), self.turn(), self.usage(), self.turn('ct', 't1'), self.usage('child', 'ct', 't1', 'r2')])
        self.write('grandchild', [self.meta('grand', 'child', '/elsewhere', {'subagent': {'other': 'guardian'}}), self.turn('gt', 't1'), self.usage('grand', 'gt', 't1', 'r3')])
        self.write('unrelated', [self.meta('unrelated', cwd='/unrelated'), self.turn(), self.usage('unrelated', response='r4')])
        collect(self.state)
        snap = self.snap()
        self.assertEqual(len(snap['responses']), 3)
        self.assertEqual(len(snap['threads']), 3)
        self.assertEqual(next(t['role'] for t in snap['threads'] if t['thread_id'] == 'grand'), 'approval_review')
        Ledger(self.state).bind('root', 'CHG-K-003', 'WP-001')
        self.assertEqual(attribute(self.snap(), next(r for r in snap['responses'] if r['response_id'] == 'r3'))['change_id'], 'CHG-K-003')

    def test_partial_line_archive_move_and_truncation(self):
        path = self.write('root', [self.meta('root'), self.turn()])
        line = json.dumps(self.usage())
        with path.open('a') as handle:
            handle.write(line[:20])
        self.assertEqual(collect(self.state)['inserted_responses'], 0)
        with path.open('a') as handle:
            handle.write(line[20:] + '\n')
        self.assertEqual(collect(self.state)['inserted_responses'], 1)
        archive = self.home / 'archived_sessions' / 'root.jsonl'
        archive.parent.mkdir()
        path.rename(archive)
        self.assertEqual(collect(self.state)['inserted_responses'], 0)
        self.write('root', [self.meta('root'), self.turn('t2'), self.usage(turn='t2', response='r2')])
        self.assertEqual(collect(self.state)['inserted_responses'], 1)
        self.assertEqual(len(self.snap()['responses']), 2)

    def test_from_turn_override_inherited_by_descendants(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage(), self.turn('t2', stamp='2026-10-18T02:00:00Z'), self.usage(turn='t2', response='r2')])
        self.write('child', [self.meta('child', 'root'), self.turn('ct', 't2', stamp='2026-10-18T02:01:00Z'), self.usage('child', 'ct', 't2', 'r3')])
        collect(self.state)
        ledger = Ledger(self.state)
        ledger.bind('root', 'CHG-K-001')
        ledger.bind('root', 'CHG-K-003', from_turn='t2')
        ledger.annotate('t2', 'implementation', 'accepted', 'https://example.org/pull/1')
        snap = ledger.snapshot()
        attrs = {r['response_id']: attribute(snap, r) for r in snap['responses']}
        self.assertEqual(attrs['r1']['change_id'], 'CHG-K-001')
        self.assertEqual(attrs['r2']['change_id'], 'CHG-K-003')
        self.assertEqual(attrs['r3']['change_id'], 'CHG-K-003')
        self.assertEqual(attrs['r3']['outcome'], 'accepted')
        with self.assertRaises(ValueError):
            ledger.bind('root', 'CHG-K-004', from_turn='unknown')

    def test_missing_metadata_unknown_and_legacy_coverage(self):
        self.write('root', [self.meta('root'), self.usage(), self.record('event_msg', dict(type='token_count', info=dict(total_token_usage=dict(input_tokens=5000))))])
        self.write('empty', [self.meta('empty')])
        summary = collect(self.state)
        self.assertIsNone(self.snap()['responses'][0]['model'])
        self.assertEqual(summary['diagnostics']['legacy_cumulative_usage'], 1)
        self.assertEqual(summary['diagnostics']['sessions_without_response_usage'], 1)

    def test_model_changes_resolved_by_turn_not_last_context(self):
        self.write('root', [self.meta('root'), self.turn(), self.turn('t2', model='model-b', effort='low'), self.usage(), self.usage(turn='t2', response='r2')])
        collect(self.state)
        models = {r['response_id']: r['model'] for r in self.snap()['responses']}
        self.assertEqual(models, dict(r1='model-a', r2='model-b'))

    def test_malformed_and_invalid_records_safe_diagnostics(self):
        path = self.write('root', [self.meta('root'), self.turn()])
        with path.open('a') as handle:
            handle.write('not json\n')
        broken = self.usage()
        broken['payload']['usage']['input_tokens'] = -1
        self.write('root', [broken], 'a')
        summary = collect(self.state)
        self.assertEqual(summary['diagnostics']['malformed_record'], 1)
        self.assertEqual(summary['diagnostics']['invalid_usage'], 1)
        self.assertEqual(self.snap()['responses'], [])

    def test_conflicting_response_does_not_replace_facts(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage(), self.usage(tokens=101)])
        summary = collect(self.state)
        self.assertEqual(summary['diagnostics']['conflicting_response_facts'], 1)
        self.assertEqual(self.snap()['responses'][0]['input_tokens'], 100)

    def test_concurrent_collectors_count_each_response_once(self):
        from concurrent.futures import ThreadPoolExecutor
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: collect(self.state), range(2)))
        self.assertEqual(sum(r['inserted_responses'] for r in results), 1)
        self.assertEqual(len(self.snap()['responses']), 1)

    def test_late_context_enriches_unknown_metadata(self):
        self.write('root', [self.meta('root'), self.usage()])
        collect(self.state)
        self.assertIsNone(self.snap()['responses'][0]['model'])
        self.write('root', [self.turn()], 'a')
        collect(self.state)
        self.assertEqual(self.snap()['responses'][0]['model'], 'model-a')

    def test_subagent_local_turn_binding(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        self.write('child', [self.meta('child', 'root'), self.turn('ct1', 't1'), self.usage('child', 'ct1', 't1', 'r2'), self.turn('ct2', 't1', stamp='2026-10-18T02:00:00Z'), self.usage('child', 'ct2', 't1', 'r3')])
        collect(self.state)
        ledger = Ledger(self.state)
        ledger.bind('root', 'CHG-K-001')
        ledger.bind('child', 'CHG-K-003', from_turn='ct2')
        snap = ledger.snapshot()
        attrs = {r['response_id']: attribute(snap, r)['change_id'] for r in snap['responses']}
        self.assertEqual(attrs, dict(r1='CHG-K-001', r2='CHG-K-001', r3='CHG-K-003'))

    def test_incremental_exports_with_observations_merge(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        collect(self.state)
        first = self.root / 'first.jsonl'
        export_data(self.state, first)
        destination = self.root / 'destination'
        import_data(destination, [first])
        collect(self.state)
        second = self.root / 'second.jsonl'
        export_data(self.state, second)
        import_data(destination, [second])
        self.assertEqual(len(Ledger(destination).snapshot()['responses']), 1)
        self.assertEqual(len(Ledger(destination).snapshot()['collections']), 2)

    def test_native_turn_lifecycle_bounds_and_fork_history(self):
        started = self.record('event_msg', dict(type='task_started', turn_id='t1', root_turn_id='t1'), '2026-10-18T00:59:00Z')
        ended = self.record('event_msg', dict(type='task_complete', turn_id='t1', root_turn_id='t1'), '2026-10-18T01:02:00Z')
        self.write('root', [self.meta('root'), started, self.turn(), self.usage(), ended])
        child_meta = self.meta('child', 'root')
        child_meta['payload']['timestamp'] = '2026-10-18T01:03:00Z'
        self.write('child', [child_meta, started, ended, self.turn('ct', 't1'), self.usage('child', 'ct', 't1', 'r2')])
        collect(self.state)
        snap = self.snap()
        turn = next(t for t in snap['turns'] if t['thread_id'] == 'root')
        self.assertEqual(turn['started_at'], '2026-10-18T00:59:00Z')
        self.assertEqual(turn['ended_at'], '2026-10-18T01:02:00Z')
        self.assertEqual(len(snap['lifecycles']), 2)
        self.assertIsNone(next(t for t in snap['threads'] if t['thread_id'] == 'root')['ended_at'])
        self.assertEqual(collect(self.state, full=True)['inserted_responses'], 0)
        self.assertEqual(len(self.snap()['lifecycles']), 2)

    def test_queued_lifecycle_roundtrip_child_identity_resume_and_export(self):
        from tools.agent_usage.automation import hook
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        self.write('child', [self.meta('child', 'root'), self.turn('ct', 't1'), self.usage('child', 'ct', 't1', 'r2')])
        collect(self.state)
        hook(self.state, dict(hook_event_name='SubagentStart', session_id='root', agent_id='child', agent_type='worker', cwd=str(self.repo)))
        hook(self.state, dict(hook_event_name='SubagentStop', session_id='root', agent_id='child', cwd=str(self.repo)))
        queued = {str(p): json.loads(p.read_text()) for p in (self.state / 'queue').glob('*.json')}
        for event in queued.values():
            event['time'] = '2026-10-18T01:00:00Z' if event['event'] == 'SubagentStart' else '2026-10-18T01:05:00Z'
        summary = process_events(self.state, queued)
        self.assertCountEqual(summary['consumed'], list(queued))
        self.assertEqual(summary['pending'], [])
        self.assertTrue(all(Path(p).exists() for p in queued))  # Caller acknowledges only after report succeeds.
        snap = self.snap()
        child = next(t for t in snap['threads'] if t['thread_id'] == 'child')
        parent = next(t for t in snap['threads'] if t['thread_id'] == 'root')
        self.assertEqual(child['ended_at'], '2026-10-18T01:05:00Z')
        self.assertIsNone(parent['ended_at'])
        self.assertTrue(all(e['thread_id'] == 'child' and e['parent_thread_id'] == 'root' for e in snap['lifecycles']))
        output = self.root / 'life.jsonl'
        export_data(self.state, output)
        imported = self.root / 'imported'
        import_data(imported, [output])
        self.assertEqual(Ledger(imported).snapshot()['threads'], snap['threads'])
        self.assertEqual(process_events(self.state, queued)['consumed'], summary['consumed'])
        self.assertEqual(len(self.snap()['lifecycles']), 2)
        resume = dict(version=1, project_id='turnup', event='SubagentStart', session_id='root', agent_id='child', time='2026-10-18T02:00:00Z')
        process_events(self.state, {'resume': resume})
        self.assertIsNone(next(t for t in self.snap()['threads'] if t['thread_id'] == 'child')['ended_at'])
        export_data(self.state, output)
        import_data(imported, [output])
        self.assertEqual(Ledger(imported).snapshot()['threads'], self.snap()['threads'])

    def test_unavailable_and_rejected_queue_events_remain_pending(self):
        from tools.agent_usage.automation import hook
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        collect(self.state)
        hook(self.state, dict(hook_event_name='SubagentStop', session_id='root', agent_id='future', cwd=str(self.repo)))
        queued = {str(p): json.loads(p.read_text()) for p in (self.state / 'queue').glob('*.json')}
        for event in queued.values():
            event['time'] = '2026-10-18T04:00:00Z'
        queued['bad'] = dict(version=1, project_id='turnup', event=['SessionEnd'], session_id='root', time='wrong')
        result = process_events(self.state, queued)
        self.assertEqual(result['consumed'], [])
        self.assertEqual(result['rejected'], ['bad'])
        self.assertEqual(len(result['pending']), 1)
        self.assertTrue(all(Path(p).exists() for p in result['pending']))
        self.write('future', [self.meta('future', 'root')])
        collect(self.state)
        result = process_events(self.state, queued)
        self.assertEqual(len(result['consumed']), 1)
        self.assertEqual(result['pending'], [])
        self.assertIsNotNone(next(t for t in self.snap()['threads'] if t['thread_id'] == 'future')['ended_at'])

    def test_stop_ends_turn_but_not_session(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        collect(self.state)
        process_events(self.state, {'stop': dict(version=1, project_id='turnup', event='Stop', session_id='root', turn_id='t1', time='2026-10-18T01:10:00Z')})
        self.assertIsNone(self.snap()['threads'][0]['ended_at'])
        self.assertEqual(self.snap()['turns'][0]['ended_at'], '2026-10-18T01:10:00Z')

    def test_interrupt_ends_matching_turn_for_sixty_seconds_and_later_resume_reopens_it(self):
        self.write('root', [self.meta('root'), self.turn(stamp='2026-10-18T01:00:00Z')])
        collect(self.state)
        process_events(self.state, {
            'interrupt': dict(version=1, project_id='turnup', event='Interrupt', session_id='root', turn_id='t1', time='2026-10-18T01:01:00Z')
        })
        snapshot = self.snap()
        self.assertIsNone(snapshot['threads'][0]['ended_at'])
        self.assertEqual(snapshot['turns'][0]['ended_at'], '2026-10-18T01:01:00Z')
        start = next(t for t in snapshot['turns'] if t['turn_id'] == 't1')['started_at']
        end = next(t for t in snapshot['turns'] if t['turn_id'] == 't1')['ended_at']
        from tools.agent_usage.store import instant
        self.assertEqual((instant(end) - instant(start)).total_seconds(), 60)

        self.write('root', [self.record('event_msg', dict(type='task_started', turn_id='t1', root_turn_id='t1'), '2026-10-18T01:02:00Z')], mode='a')
        collect(self.state)
        self.assertIsNone(next(t for t in self.snap()['turns'] if t['turn_id'] == 't1')['ended_at'])
        self.write('root', [self.record('event_msg', dict(type='task_complete', turn_id='t1', root_turn_id='t1'), '2026-10-18T01:03:00Z')], mode='a')
        collect(self.state)
        self.assertEqual(next(t for t in self.snap()['turns'] if t['turn_id'] == 't1')['ended_at'], '2026-10-18T01:03:00Z')

    def test_interrupt_and_completed_lifecycle_only_root_tasks_roundtrip_idempotently(self):
        records = [self.meta('root')]
        for kind, turn, stamp in (
            ('task_started', 'interrupted', '2026-10-18T01:00:00Z'),
            ('task_started', 'completed', '2026-10-18T02:00:00Z'),
            ('task_complete', 'completed', '2026-10-18T02:01:00Z'),
        ):
            records.append(self.record('event_msg', dict(type=kind, turn_id=turn, root_turn_id=turn), stamp))
        self.write('root', records)
        collect(self.state)
        process_events(self.state, {
            'interrupt': dict(version=1, project_id='turnup', event='Interrupt', session_id='root', turn_id='interrupted', time='2026-10-18T01:01:00Z')
        })

        ledger = Ledger(self.state)
        ledger.annotate('interrupted', 'correction', 'needs_changes', 'Synthetic interruption')
        ledger.annotate('completed', 'delivery', 'accepted', 'Synthetic completion')
        snapshot = ledger.snapshot()
        self.assertEqual(snapshot['responses'], [])
        self.assertEqual(set(discover_root_tasks(snapshot)), {('root', 'interrupted'), ('root', 'completed')})
        self.assertEqual(root_task_bounds(snapshot, 'root', 'interrupted'), ('2026-10-18T01:00:00Z', '2026-10-18T01:01:00Z'))
        self.assertEqual(root_task_bounds(snapshot, 'root', 'completed'), ('2026-10-18T02:00:00Z', '2026-10-18T02:01:00Z'))
        self.assertIn('Interrupt', {event['event_name'] for event in snapshot['lifecycles']})

        exported = self.root / 'root-tasks.jsonl'
        export_data(self.state, exported)
        imported = self.root / 'imported-root-tasks'
        first = import_data(imported, [exported])
        second = import_data(imported, [exported])
        imported_snapshot = Ledger(imported).snapshot()
        self.assertGreater(first['inserted_records'], 0)
        self.assertEqual(second['inserted_records'], 0)
        self.assertEqual(len(imported_snapshot['lifecycles']), 4)
        self.assertEqual(len(imported_snapshot['annotations']), 2)
        self.assertEqual(set(discover_root_tasks(imported_snapshot)), {('root', 'interrupted'), ('root', 'completed')})

    def test_root_task_discovery_rejects_child_and_unresolved_ancestry_ids(self):
        ledger = Ledger(self.state)
        with ledger.transaction() as db:
            for thread_id, parent_id in (('root', None), ('child', 'root'), ('orphan', 'missing-parent')):
                ledger.put(db, 'threads', dict(thread_id=thread_id, parent_thread_id=parent_id, project_id='turnup', owner='keith'))
            for thread_id, turn_id in (('root', 'root-turn'), ('child', 'child-only'), ('orphan', 'orphan-only')):
                ledger.put(db, 'turns', dict(thread_id=thread_id, turn_id=turn_id, root_turn_id=turn_id, started_at='2026-10-18T01:00:00Z'))
        snapshot = ledger.snapshot()
        self.assertEqual(discover_root_tasks(snapshot), {('root', 'root-turn')})
        ledger.annotate('root-turn', 'review', 'accepted', 'Synthetic root task')
        for unknown in ('child-only', 'orphan-only', 'invented'):
            with self.subTest(turn=unknown), self.assertRaisesRegex(ValueError, 'Unknown root turn'):
                ledger.annotate(unknown, 'review', 'accepted', 'Must remain unknown')

    def test_ledger_rejects_selected_state_symlink_before_creating_database(self):
        target = self.root / 'private-target'
        target.mkdir()
        link = self.root / 'state-link'
        try:
            link.symlink_to(target, target_is_directory=True)
        except (NotImplementedError, OSError) as error:
            self.skipTest(f'Symlink creation is unavailable: {error}')
        with self.assertRaises(OSError):
            Ledger(link)
        self.assertFalse((target / 'ledger.sqlite3').exists())

    def test_malformed_exchange_container_types_rejected(self):
        for index, value in enumerate(([], 'text', 3, None, {'type': [], 'data': {}}, {'type': {}, 'data': {}}, {'type': 'threads', 'data': []})):
            path = self.root / f'malformed-{index}.jsonl'
            path.write_text(json.dumps(dict(type='header', version=1)) + '\n' + json.dumps(value) + '\n')
            with self.assertRaises(ValueError):
                import_data(self.root / 'invalid', [path])

    def export_fixture(self):
        self.write('root', [self.meta('root'), self.turn(), self.usage()])
        collect(self.state)
        Ledger(self.state).bind('root', 'CHG-K-003')
        evidence = (
            'See /Users/keith/private.txt and C:\\Users\\Darryl\\notes.txt '
            'https://example.org/pull/1; '
            'file:///Users/alice/secret-uri-alice.txt '
            'file://C:/Users/bob/secret-uri-bob.txt '
            'FILE:///Users/carol/secret-uri-carol.txt '
            'file:/C:/Users/dana/secret-uri-dana.txt '
            'file://localhost/Users/erin/secret-uri-erin.txt '
            'file://server/share/frank/secret-uri-frank.txt '
            'file:///Users/Gail%20Grove/secret-uri-gail.txt '
            'file:///Users/(harry)/secret-uri-harry.txt '
            'file:///C:/Users/ivy(work)/secret-uri-ivy.txt; '
            'quoted "FILE:///Users/jules/secret-uri-jules.txt"; '
            'angle <file:///Users/kim/secret-uri-kim.txt>; '
            'link [notes](file:///Users/lee(notes)/secret-uri-lee.txt). '
            'Unrelated schemes: profile:///Users/mallory/keep-profile.txt '
            'and my-file:///Users/nick/keep-my-file.txt'
        )
        Ledger(self.state).annotate('t1', 'review', 'accepted', evidence)
        self.source_snapshot = Ledger(self.state).snapshot(raw=True)
        output = self.root / 'export.jsonl'
        export_data(self.state, output)
        return output

    def test_export_privacy_and_repeated_import(self):
        output = self.export_fixture()
        text = output.read_text()
        self.assertEqual(Ledger(self.state).snapshot(raw=True), self.source_snapshot)
        self.assertNotIn(str(self.repo), text)
        self.assertNotIn('/Users/keith', text)
        self.assertNotIn('Darryl', text)
        self.assertIn('https://example.org/pull/1', text)
        self.assertIsNone(re.search(r'(?i)(?<![\w.+-])file:', text))
        for secret in (
            'secret-uri-alice.txt', 'secret-uri-bob.txt', 'secret-uri-carol.txt',
            'secret-uri-dana.txt', 'secret-uri-erin.txt', 'secret-uri-frank.txt',
            'secret-uri-gail.txt', 'secret-uri-harry.txt', 'secret-uri-ivy.txt',
            'secret-uri-jules.txt', 'secret-uri-kim.txt', 'secret-uri-lee.txt',
            'alice', 'bob', 'carol', 'dana', 'erin', 'frank', 'Gail%20Grove',
            '(harry)', 'ivy(work)', 'jules', 'kim', 'lee(notes)',
        ):
            self.assertNotIn(secret.lower(), text.lower())
        self.assertIn('profile:///Users/mallory/keep-profile.txt', text)
        self.assertIn('my-file:///Users/nick/keep-my-file.txt', text)
        self.assertNotIn('cwd', text)
        self.assertNotIn('codex_home', text)
        self.assertIn('machine_id', text)
        self.assertNotIn('creator_account_id', text)
        other = self.root / 'other'
        first = import_data(other, [output])
        second = import_data(other, [output])
        self.assertGreater(first['inserted_records'], 0)
        self.assertEqual(second['inserted_records'], 0)
        self.assertEqual(Ledger(other).snapshot()['responses'][0]['owner'], 'keith')

    def test_import_rejects_file_uri_atomically(self):
        output = self.export_fixture()
        destination = self.root / 'existing-import'
        import_data(destination, [output])
        before = Ledger(destination).snapshot()
        lines = [json.loads(line) for line in output.read_text().splitlines()]
        lines.append(dict(
            type='threads',
            data=dict(
                thread_id='incoming',
                parent_thread_id=None,
                project_id='turnup',
                owner='keith',
                role='root',
                agent_path=None,
                started_at=None,
                ended_at=None,
                cli_version=None,
                source_revision='FILE:///Users/(incoming-user)',
            ),
        ))
        bad = self.root / 'unsanitized-file-uri.jsonl'
        bad.write_text('\n'.join(json.dumps(record) for record in lines) + '\n')
        with self.assertRaisesRegex(ValueError, 'Local path prohibited'):
            import_data(destination, [bad])
        self.assertEqual(Ledger(destination).snapshot(), before)

    def test_conflicting_import_atomic_across_files(self):
        output = self.export_fixture()
        imported = self.root / 'other'
        import_data(imported, [output])
        before = Ledger(imported).snapshot()
        lines = [json.loads(line) for line in output.read_text().splitlines()]
        for line in lines:
            if line['type'] == 'responses':
                line['data']['input_tokens'] = 999
        bad = self.root / 'bad.jsonl'
        bad.write_text('\n'.join(json.dumps(line) for line in lines) + '\n')
        with self.assertRaises(ValueError):
            import_data(imported, [bad])
        self.assertEqual(Ledger(imported).snapshot(), before)

    def test_import_known_parent_cycles_rejected_unknown_parent_allowed(self):
        output = self.export_fixture()
        original = [json.loads(line) for line in output.read_text().splitlines()]
        for parent, raises in [('root', True), ('unknown-parent', False)]:
            records = json.loads(json.dumps(original))
            next(r['data'] for r in records if r['type'] == 'threads')['parent_thread_id'] = parent
            path = self.root / f'parent-{parent}.jsonl'
            path.write_text('\n'.join(json.dumps(record) for record in records) + '\n')
            destination = self.root / f'state-{parent}'
            if raises:
                with self.assertRaisesRegex(ValueError, 'cycle'):
                    import_data(destination, [path])
                self.assertEqual(Ledger(destination).snapshot()['responses'], [])
            else:
                import_data(destination, [path])
                self.assertEqual(len(Ledger(destination).snapshot()['responses']), 1)

    def test_unknown_fields_versions_and_private_paths_rejected(self):
        output = self.export_fixture()
        lines = [json.loads(line) for line in output.read_text().splitlines()]
        for mutate in ('version', 'field', 'path'):
            trial = json.loads(json.dumps(lines))
            if mutate == 'version':
                trial[0]['version'] = 999
            elif mutate == 'field':
                trial[1]['data']['prompt'] = 'sensitive'
            else:
                annotation = next(r for r in trial if r['type'] == 'annotations')
                annotation['data']['evidence'] = '/Users/sensitive/file'
            bad = self.root / f'{mutate}.jsonl'
            bad.write_text('\n'.join(json.dumps(line) for line in trial) + '\n')
            with self.assertRaises(ValueError):
                import_data(self.root / 'bad-state', [bad])


if __name__ == '__main__':
    unittest.main()

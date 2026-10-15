import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Snapshot, Task } from '../src/models/types';
import { diffSnapshots } from '../src/sync/diff';
import { parseHebrewDate } from '../src/util/date';

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id, source: 'amit', courseName: 'מתמטיקה', title: id, description: null, dueAt: null,
  status: 'open', grade: null, maxGrade: null, teacherComment: null, url: null, ...extra,
});
const snap = (tasks: Task[]): Snapshot => ({ tasks, grades: [], notes: [] });

test('detects new tasks, new grades and new teacher comments', () => {
  const prev = snap([task('a'), task('b')]);
  const next = snap([task('a', { grade: 90, maxGrade: 100, status: 'graded' }), task('b', { teacherComment: 'יפה' }), task('c')]);
  const kinds = diffSnapshots(prev, next).map((e) => e.kind).sort();
  assert.deepEqual(kinds, ['newComment', 'newGrade', 'newTask']);
});

test('no events when nothing changed', () => {
  const s = snap([task('a', { grade: 80, teacherComment: 'x' })]);
  assert.deepEqual(diffSnapshots(s, s), []);
});

test('grade reported via task is not reported twice via grades list', () => {
  const prev = snap([task('a')]);
  const next: Snapshot = {
    tasks: [task('a', { grade: 95 })],
    grades: [{ id: 'a', source: 'amit', courseName: 'מתמטיקה', title: 'a', score: 95, maxScore: 100, date: null, comment: null }],
    notes: [],
  };
  assert.equal(diffSnapshots(prev, next).length, 1);
});

test('hebrew date parsing', () => {
  const d = new Date(parseHebrewDate('15/10/2026')!);
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 9, 15, 23]);
  assert.equal(new Date(parseHebrewDate('3.4.26 08:15')!).getMinutes(), 15);
  assert.equal(parseHebrewDate('ללא'), null);
});

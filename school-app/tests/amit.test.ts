// בדיקות לפרסר של אמי"ת. כשמגיעים קבצי HTML אמיתיים – מוסיפים אותם ל-fixtures ובדיקה לכל אחד.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { findLoginForm, isLoginPage, parseScore, parseStatus, parseTaskList, parseTaskPage } from '../src/sources/amit/parse';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const BASE = 'https://lms.example.org/student/list.aspx';

test('task list: auto-detects the table and maps columns', () => {
  const tasks = parseTaskList(fixture('sample-task-list.html'), BASE);
  assert.equal(tasks.length, 3);
  const [math, eng, hist] = tasks;
  assert.equal(math.id, 'amit:1001');
  assert.equal(math.courseName, 'מתמטיקה');
  assert.equal(math.title, 'דף עבודה 3');
  assert.equal(math.status, 'open');
  assert.equal(math.url, 'https://lms.example.org/student/task.aspx?id=1001');
  assert.equal(new Date(math.dueAt!).getFullYear(), 2099);

  assert.equal(eng.status, 'submitted');
  assert.equal(eng.grade, 88);
  assert.equal(eng.teacherComment, 'כל הכבוד');
  assert.equal(new Date(eng.dueAt!).getHours(), 14);

  assert.equal(hist.status, 'missing');
});

test('login page detection + login form extraction ignores other forms', () => {
  const html = fixture('sample-login.html');
  assert.ok(isLoginPage(html));
  assert.ok(!isLoginPage(fixture('sample-task-list.html')));
  const form = findLoginForm(html, 'https://lms.example.org/Login.aspx')!;
  assert.equal(form.action, 'https://lms.example.org/Login.aspx');
  assert.equal(form.userField, 'txtUser');
  assert.equal(form.passField, 'txtPass');
  assert.equal(form.fields.__VIEWSTATE, 'abc123');
  assert.ok(!('q' in form.fields));
  assert.equal(findLoginForm(fixture('sample-task-list.html'), BASE), null);
});

test('scores and statuses', () => {
  assert.deepEqual(parseScore('17 מתוך 20'), { score: 17, max: 20 });
  assert.deepEqual(parseScore('92.5'), { score: 92.5, max: 100 });
  assert.equal(parseScore('לא נבדק'), null);
  assert.equal(parseStatus('לא הוגש'), 'missing');
  assert.equal(parseStatus('הוגש באיחור'), 'late');
  assert.equal(parseStatus('נבדק'), 'graded');
});

test('task page falls back to main content without forms/scripts', () => {
  const d = parseTaskPage('<html><body><nav>תפריט</nav><main><h2>הוראות</h2><p>פתרו 1-5</p><form><button>הגש</button></form><script>x()</script></main></body></html>');
  assert.match(d.description!, /פתרו 1-5/);
  assert.doesNotMatch(d.description!, /הגש|x\(\)|תפריט/);
});

// פרסר לדפי HTML של אמי"ת. קוד טהור (בלי React Native) – נבדק ב-tests/amit.test.ts מול קבצי HTML אמיתיים.
// קורא בלבד: רק טקסט ומאפיינים. אין כאן שום לחיצה או מילוי שדות.
import { parse, type HTMLElement } from 'node-html-parser';
import type { Grade, Task, TaskStatus } from '../../models/types';
import { parseHebrewDate } from '../../util/date';
import { AMIT_SELECTORS, HEADER_PATTERNS, LOGIN_PAGE_HINTS, STATUS_PATTERNS } from './selectors';

type Field = keyof typeof HEADER_PATTERNS;

const clean = (s: string | undefined | null) => (s ?? '').replace(/\s+/g, ' ').trim();

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function absUrl(href: string | undefined, baseUrl: string): string | null {
  if (!href || href.startsWith('javascript:') || href === '#') return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

/** מזהה יציב: מספר מזהה מתוך הקישור אם יש, אחרת hash של התוכן */
function stableId(url: string | null, ...parts: string[]): string {
  if (url) {
    const m = url.match(/[?&](?:id|taskId|assignmentId|activityId|aid)=([\w-]+)/i) ?? url.match(/\/(\d{3,})(?:[/?#]|$)/);
    if (m) return m[1];
  }
  return hash(parts.join('|'));
}

export function parseStatus(text: string): TaskStatus | null {
  const t = clean(text);
  if (!t) return null;
  for (const [re, status] of STATUS_PATTERNS) if (re.test(t)) return status;
  return null;
}

/** "85", "85/100", "17 מתוך 20", "92.5" */
export function parseScore(text: string): { score: number; max: number } | null {
  const t = clean(text);
  const m = t.match(/(\d+(?:\.\d+)?)\s*(?:\/|מתוך)\s*(\d+(?:\.\d+)?)/);
  if (m) return { score: +m[1], max: +m[2] };
  const single = t.match(/^(\d+(?:\.\d+)?)$/);
  if (single) return { score: +single[1], max: 100 };
  return null;
}

export function isLoginPage(html: string): boolean {
  return LOGIN_PAGE_HINTS[0].test(html) && LOGIN_PAGE_HINTS[1].test(html);
}

// ---------- זיהוי טבלאות אוטומטי ----------

const FIELD_PRIORITY: Field[] = ['due', 'subject', 'status', 'grade', 'comment', 'title', 'date'];

function classifyHeader(text: string): Field | null {
  for (const f of FIELD_PRIORITY) if (HEADER_PATTERNS[f].test(text)) return f;
  return null;
}

interface TableRow {
  cells: Partial<Record<Field, string>>;
  link: string | null;
}

function readTables(root: HTMLElement, baseUrl: string, required: Field[]): TableRow[] {
  const out: TableRow[] = [];
  for (const table of root.querySelectorAll('table')) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;
    const headerRow = table.querySelector('thead tr') ?? rows[0];
    const headers = headerRow.querySelectorAll('th, td').map((c) => classifyHeader(clean(c.text)));
    const cols = new Map<Field, number>();
    headers.forEach((f, i) => {
      if (f && !cols.has(f)) cols.set(f, i);
    });
    if (!required.every((f) => cols.has(f)) || cols.size < 2) continue;
    for (const tr of rows) {
      if (tr === headerRow) continue;
      const tds = tr.querySelectorAll('td');
      if (tds.length < cols.size) continue;
      const cells: Partial<Record<Field, string>> = {};
      for (const [f, i] of cols) cells[f] = clean(tds[i]?.text);
      const a = tr.querySelector('a[href]');
      out.push({ cells, link: absUrl(a?.getAttribute('href'), baseUrl) });
    }
  }
  return out;
}

function readBySelectors(
  root: HTMLElement,
  baseUrl: string,
  sel: { row: string; link?: string } & Partial<Record<Field | 'score', string>>,
): TableRow[] {
  return root.querySelectorAll(sel.row).map((row) => {
    const get = (s?: string) => (s ? clean(row.querySelector(s)?.text) : undefined);
    const linkEl = sel.link ? row.querySelector(sel.link) : row.querySelector('a[href]');
    return {
      cells: {
        subject: get(sel.subject), title: get(sel.title), due: get(sel.due), status: get(sel.status),
        grade: get(sel.grade ?? sel.score), comment: get(sel.comment), date: get(sel.date),
      },
      link: absUrl(linkEl?.getAttribute('href'), baseUrl),
    };
  });
}

// ---------- דפים ----------

export function parseTaskList(html: string, baseUrl: string): Task[] {
  const root = parse(html);
  const sel = AMIT_SELECTORS.taskList;
  const rows = sel.row ? readBySelectors(root, baseUrl, sel) : readTables(root, baseUrl, ['title']);
  const tasks: Task[] = [];
  for (const { cells, link } of rows) {
    const title = cells.title;
    if (!title) continue;
    const courseName = cells.subject || 'כללי';
    const dueAt = parseHebrewDate(cells.due ?? cells.date);
    const score = cells.grade ? parseScore(cells.grade) : null;
    let status = parseStatus(cells.status ?? '') ?? (score ? 'graded' : 'open');
    if (status === 'open' && dueAt && new Date(dueAt).getTime() < Date.now()) status = 'missing';
    tasks.push({
      id: `amit:${stableId(link, courseName, title, cells.due ?? '')}`,
      source: 'amit',
      courseName,
      title,
      description: null,
      dueAt,
      status,
      grade: score?.score ?? null,
      maxGrade: score?.max ?? null,
      teacherComment: cells.comment || null,
      url: link,
    });
  }
  return tasks;
}

export interface TaskPageDetails {
  description: string | null;
  teacherComment: string | null;
  grade: { score: number; max: number } | null;
}

export function parseTaskPage(html: string): TaskPageDetails {
  const root = parse(html);
  const sel = AMIT_SELECTORS.taskPage;
  const pick = (s: string) => (s ? clean(root.querySelector(s)?.structuredText) || null : null);
  let description = pick(sel.description);
  if (!description) {
    // ברירת מחדל: התוכן הראשי של הדף, בלי תפריטים
    const main = root.querySelector('main, [role=main], #content, .content, article') ?? root.querySelector('body');
    main?.querySelectorAll('script, style, nav, header, footer, form, button').forEach((el) => el.remove());
    description = main ? main.structuredText.trim().slice(0, 4000) || null : null;
  }
  const gradeText = pick(sel.grade);
  return {
    description,
    teacherComment: pick(sel.teacherComment),
    grade: gradeText ? parseScore(gradeText) : null,
  };
}

export function parseGrades(html: string, baseUrl: string): Grade[] {
  const root = parse(html);
  const sel = AMIT_SELECTORS.grades;
  const rows = sel.row ? readBySelectors(root, baseUrl, sel) : readTables(root, baseUrl, ['grade']);
  const grades: Grade[] = [];
  for (const { cells, link } of rows) {
    const score = cells.grade ? parseScore(cells.grade) : null;
    if (!score) continue;
    const courseName = cells.subject || 'כללי';
    const title = cells.title || courseName;
    const date = parseHebrewDate(cells.date ?? cells.due);
    grades.push({
      id: `amit:g:${stableId(link, courseName, title, cells.date ?? '')}`,
      source: 'amit',
      courseName,
      title,
      score: score.score,
      maxScore: score.max,
      date,
      comment: cells.comment || null,
    });
  }
  return grades;
}

// ---------- טופס התחברות (הטופס היחיד שמותר לשלוח) ----------

export interface LoginForm {
  action: string;
  method: string;
  fields: Record<string, string>;
  userField: string;
  passField: string;
}

/** מוצא את הטופס שמכיל שדה סיסמה. מחזיר null אם אין כזה. */
export function findLoginForm(html: string, pageUrl: string): LoginForm | null {
  const root = parse(html);
  for (const form of root.querySelectorAll('form')) {
    const inputs = form.querySelectorAll('input');
    const pass = inputs.find((i) => (i.getAttribute('type') ?? '').toLowerCase() === 'password');
    if (!pass?.getAttribute('name')) continue;
    const user = inputs.find((i) => {
      const t = (i.getAttribute('type') ?? 'text').toLowerCase();
      return (t === 'text' || t === 'email' || t === 'tel' || t === 'number') && i.getAttribute('name');
    });
    if (!user) continue;
    const fields: Record<string, string> = {};
    for (const i of inputs) {
      const name = i.getAttribute('name');
      const type = (i.getAttribute('type') ?? 'text').toLowerCase();
      if (!name || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio') continue;
      fields[name] = i.getAttribute('value') ?? '';
    }
    return {
      action: absUrl(form.getAttribute('action') || pageUrl, pageUrl) ?? pageUrl,
      method: (form.getAttribute('method') ?? 'post').toUpperCase(),
      fields,
      userField: user.getAttribute('name')!,
      passField: pass.getAttribute('name')!,
    };
  }
  return null;
}

// משיכת נתונים מאמי"ת עם fetch רגיל. עוגיות ההתחברות משותפות בין ה-WebView ל-fetch באנדרואיד,
// ולכן אחרי התחברות אחת במסך אמי"ת, הסנכרון (גם ברקע, כשאין מסך) יכול לקרוא את הדפים.
// אם הסשן פג – מתחברים מחדש עם הטופס היחיד שמותר לשלוח: טופס ההתחברות.
import { kvGetJson, kvSetJson } from '@/db/db';
import type { Snapshot, Task } from '@/models/types';
import { getAmitCredentials } from '@/secure/store';
import { findLoginForm, isLoginPage, parseGrades, parseTaskList, parseTaskPage } from './parse';

export interface AmitConfig {
  /** הדף שבו נפתח הדפדפן במסך החיבור */
  startUrl: string;
  /** הדף שבו נמצא טופס ההתחברות (נלמד אוטומטית) */
  loginUrl: string | null;
  tasksUrl: string | null;
  gradesUrl: string | null;
}

export const DEFAULT_AMIT_CONFIG: AmitConfig = {
  startUrl: 'https://www.amit.org.il/',
  loginUrl: null,
  tasksUrl: null,
  gradesUrl: null,
};

const CONFIG_KEY = 'amit.config';
export const getAmitConfig = () => kvGetJson<AmitConfig>(CONFIG_KEY, DEFAULT_AMIT_CONFIG);
export async function updateAmitConfig(patch: Partial<AmitConfig>): Promise<AmitConfig> {
  const next = { ...(await getAmitConfig()), ...patch };
  await kvSetJson(CONFIG_KEY, next);
  return next;
}

export class AmitError extends Error {}

const MAX_DETAIL_PAGES = 10;

async function fetchHtml(url: string): Promise<{ html: string; url: string }> {
  const res = await fetch(url, { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!res.ok) throw new AmitError(`האתר של אמי"ת החזיר שגיאה ${res.status}`);
  return { html: await res.text(), url: res.url || url };
}

/** שולח את טופס ההתחברות בלבד. זה הטופס היחיד שהאפליקציה שולחת אי-פעם. */
async function login(cfg: AmitConfig): Promise<void> {
  const creds = await getAmitCredentials();
  if (!creds) throw new AmitError('חסרים שם משתמש וסיסמה לאמי"ת.');
  if (!cfg.loginUrl) throw new AmitError('צריך להתחבר פעם אחת דרך מסך אמי"ת בהגדרות.');
  const page = await fetchHtml(cfg.loginUrl);
  const form = findLoginForm(page.html, page.url);
  if (!form) throw new AmitError('לא נמצא טופס התחברות. ייתכן שהאתר השתנה – התחבר שוב ממסך אמי"ת.');
  const body = new URLSearchParams({ ...form.fields, [form.userField]: creds.username, [form.passField]: creds.password });
  if (form.method === 'GET') {
    await fetch(`${form.action}${form.action.includes('?') ? '&' : '?'}${body}`, { credentials: 'include' });
  } else {
    await fetch(form.action, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }
}

async function fetchAuthed(url: string, cfg: AmitConfig, state: { triedLogin: boolean }) {
  let page = await fetchHtml(url);
  if (isLoginPage(page.html) && !state.triedLogin) {
    state.triedLogin = true;
    await login(cfg);
    page = await fetchHtml(url);
  }
  if (isLoginPage(page.html)) {
    throw new AmitError('ההתחברות לאמי"ת נכשלה. בדוק שם משתמש וסיסמה, או התחבר מחדש ממסך אמי"ת.');
  }
  return page;
}

export async function isAmitConfigured(): Promise<boolean> {
  const [creds, cfg] = await Promise.all([getAmitCredentials(), getAmitConfig()]);
  return !!creds && !!cfg.tasksUrl;
}

export async function fetchAmit(prev: Snapshot): Promise<Snapshot> {
  const cfg = await getAmitConfig();
  if (!cfg.tasksUrl) throw new AmitError('עוד לא סומן דף המשימות. פתח "אמי"ת" בהגדרות ולחץ "📌 זה דף המשימות".');
  const state = { triedLogin: false };

  const list = await fetchAuthed(cfg.tasksUrl, cfg, state);
  const tasks = parseTaskList(list.html, list.url);

  // פרטים מלאים מדף המשימה – רק למשימות שעוד אין לנו את התיאור שלהן
  const prevById = new Map(prev.tasks.map((t) => [t.id, t]));
  let fetched = 0;
  for (const t of tasks) {
    const old = prevById.get(t.id);
    if (old?.description) {
      t.description = old.description;
      t.teacherComment ??= old.teacherComment;
    }
    const needsDetails = !t.description || (t.status === 'graded' && !t.teacherComment && !old?.teacherComment);
    if (needsDetails && t.url && fetched < MAX_DETAIL_PAGES) {
      fetched++;
      try {
        const page = await fetchAuthed(t.url, cfg, state);
        mergeDetails(t, parseTaskPage(page.html));
      } catch {
        // דף משימה בודד שנכשל לא מפיל את כל הסנכרון
      }
    }
  }

  const grades = cfg.gradesUrl ? parseGrades((await fetchAuthed(cfg.gradesUrl, cfg, state)).html, cfg.gradesUrl) : [];
  return { tasks, grades, notes: [] };
}

function mergeDetails(t: Task, d: ReturnType<typeof parseTaskPage>) {
  t.description = d.description ?? t.description;
  t.teacherComment = d.teacherComment ?? t.teacherComment;
  if (d.grade && t.grade === null) {
    t.grade = d.grade.score;
    t.maxGrade = d.grade.max;
    t.status = 'graded';
  }
}

// עזרי תאריכים בעברית. בכוונה בלי Intl כדי לא להיות תלויים בתמיכת locale של המכשיר.

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** הפרש בימים קלנדריים בין היום לתאריך (0 = היום, 1 = מחר, -1 = אתמול) */
export function dayDiff(iso: string, now = new Date()): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'ללא תאריך';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "היום 23:59", "מחר", "יום רביעי", "לפני 3 ימים", או תאריך */
export function relativeDue(iso: string | null, now = new Date()): string {
  if (!iso) return 'ללא דדליין';
  const diff = dayDiff(iso, now);
  const d = new Date(iso);
  const hasTime = !(d.getHours() === 23 && d.getMinutes() === 59) && !(d.getHours() === 0 && d.getMinutes() === 0);
  const time = hasTime ? ` ${formatTime(iso)}` : '';
  if (diff === 0) return `היום${time}`;
  if (diff === 1) return `מחר${time}`;
  if (diff === -1) return 'אתמול';
  if (diff < -1) return `לפני ${-diff} ימים`;
  if (diff < 7) return `יום ${DAYS[d.getDay()]}${time}`;
  return formatDate(iso);
}

export function relativeAgo(iso: string | null, now = new Date()): string {
  if (!iso) return 'אף פעם';
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/**
 * מפענח תאריך כפי שמופיע באתרים ישראליים: 15/10/2026, 15.10.26, 15-10-2026 14:30, 2026-10-15.
 * אם אין שעה – סוף היום (23:59).
 */
export function parseHebrewDate(text: string | null | undefined): string | null {
  if (!text) return null;
  const s = text.trim();
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  let y: number, mo: number, d: number, h: number | undefined, mi: number | undefined;
  if (m) {
    [y, mo, d] = [+m[1], +m[2], +m[3]];
    h = m[4] !== undefined ? +m[4] : undefined;
    mi = m[5] !== undefined ? +m[5] : undefined;
  } else {
    m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\D+(\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    [d, mo, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    h = m[4] !== undefined ? +m[4] : undefined;
    mi = m[5] !== undefined ? +m[5] : undefined;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = h === undefined ? new Date(y, mo - 1, d, 23, 59) : new Date(y, mo - 1, d, h, mi ?? 0);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

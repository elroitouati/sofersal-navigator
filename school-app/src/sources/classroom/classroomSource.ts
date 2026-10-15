// משיכת נתונים מ-Google Classroom API (קריאה בלבד: GET בלבד).
import type { Grade, Note, Snapshot, Task, TaskStatus } from '@/models/types';
import { getAccessToken, refreshAccessToken } from './google';

const API = 'https://classroom.googleapis.com/v1';

interface Course { id: string; name: string; section?: string; alternateLink?: string }
interface GDate { year: number; month: number; day: number }
interface GTime { hours?: number; minutes?: number }
interface CourseWork {
  id: string; courseId: string; title: string; description?: string; alternateLink?: string;
  dueDate?: GDate; dueTime?: GTime; maxPoints?: number; state?: string;
}
interface Submission {
  courseWorkId: string; state?: string; late?: boolean; assignedGrade?: number;
  alternateLink?: string; updateTime?: string;
}
interface Announcement { id: string; text?: string; alternateLink?: string; updateTime?: string; creationTime?: string }

export class ClassroomApiError extends Error {}

class Client {
  constructor(private token: string) {}

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const url = `${API}${path}${qs ? `?${qs}` : ''}`;
    let res = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
    if (res.status === 401) {
      const fresh = await refreshAccessToken(this.token);
      if (!fresh) throw new ClassroomApiError('פג תוקף ההתחברות ל-Google. התחבר מחדש בהגדרות.');
      this.token = fresh;
      res = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
    }
    if (res.status === 403) {
      const body = await res.text();
      if (/SERVICE_DISABLED|has not been used|is disabled/i.test(body)) {
        throw new ClassroomApiError('ה-Classroom API לא מופעל בפרויקט ה-Google Cloud. ראה BUILD.md, שלב Google.');
      }
      throw new ClassroomApiError(
        'חשבון בית הספר חוסם גישה ל-Classroom דרך אפליקציות חיצוניות. אפשר לבקש מרכז התקשוב לאשר את האפליקציה.',
      );
    }
    if (!res.ok) throw new ClassroomApiError(`שגיאת Classroom (${res.status})`);
    return (await res.json()) as T;
  }

  async all<T>(path: string, key: string, params: Record<string, string> = {}): Promise<T[]> {
    const out: T[] = [];
    let pageToken: string | undefined;
    do {
      const page = await this.get<Record<string, unknown>>(path, { ...params, ...(pageToken ? { pageToken } : {}) });
      out.push(...((page[key] as T[] | undefined) ?? []));
      pageToken = page.nextPageToken as string | undefined;
    } while (pageToken);
    return out;
  }
}

function toIso(date?: GDate, time?: GTime): string | null {
  if (!date) return null;
  // Classroom מחזיר תאריך ושעה ב-UTC
  if (time && (time.hours !== undefined || time.minutes !== undefined)) {
    return new Date(Date.UTC(date.year, date.month - 1, date.day, time.hours ?? 0, time.minutes ?? 0)).toISOString();
  }
  return new Date(date.year, date.month - 1, date.day, 23, 59).toISOString();
}

function statusOf(sub: Submission | undefined, dueAt: string | null): TaskStatus {
  if (sub?.assignedGrade !== undefined) return 'graded';
  if (sub?.state === 'TURNED_IN') return 'submitted';
  if (sub?.state === 'RETURNED') return 'graded';
  if (sub?.late || (dueAt && new Date(dueAt).getTime() < Date.now())) return 'missing';
  return 'open';
}

export function isClassroomConnected(): Promise<boolean> {
  return getAccessToken().then((t) => !!t).catch(() => false);
}

export async function fetchClassroom(): Promise<Snapshot> {
  const token = await getAccessToken();
  if (!token) throw new ClassroomApiError('לא מחובר ל-Google.');
  const api = new Client(token);

  const courses = await api.all<Course>('/courses', 'courses', { studentId: 'me', courseStates: 'ACTIVE' });
  const tasks: Task[] = [];
  const grades: Grade[] = [];
  const notes: Note[] = [];

  await Promise.all(
    courses.map(async (c) => {
      const [work, subs, anns] = await Promise.all([
        api.all<CourseWork>(`/courses/${c.id}/courseWork`, 'courseWork'),
        api.all<Submission>(`/courses/${c.id}/courseWork/-/studentSubmissions`, 'studentSubmissions', { userId: 'me' }),
        api.get<{ announcements?: Announcement[] }>(`/courses/${c.id}/announcements`, { pageSize: '10' })
          .then((r) => r.announcements ?? [])
          .catch(() => [] as Announcement[]),
      ]);
      const subByWork = new Map(subs.map((s) => [s.courseWorkId, s]));
      for (const w of work) {
        const sub = subByWork.get(w.id);
        const dueAt = toIso(w.dueDate, w.dueTime);
        const grade = sub?.assignedGrade ?? null;
        const id = `classroom:${w.id}`;
        tasks.push({
          id, source: 'classroom', courseName: c.name, title: w.title,
          description: w.description ?? null, dueAt, status: statusOf(sub, dueAt),
          grade, maxGrade: w.maxPoints ?? null,
          // הערות פרטיות של מורה לא זמינות ב-API הרשמי של Classroom
          teacherComment: null,
          url: sub?.alternateLink ?? w.alternateLink ?? null,
        });
        if (grade !== null) {
          grades.push({
            id, source: 'classroom', courseName: c.name, title: w.title,
            score: grade, maxScore: w.maxPoints ?? 100, date: sub?.updateTime ?? dueAt, comment: null,
          });
        }
      }
      for (const a of anns) {
        if (!a.text) continue;
        notes.push({
          id: `classroom:ann:${a.id}`, source: 'classroom', courseName: c.name,
          text: a.text, date: a.updateTime ?? a.creationTime ?? null, url: a.alternateLink ?? null,
        });
      }
    }),
  );

  return { tasks, grades, notes };
}

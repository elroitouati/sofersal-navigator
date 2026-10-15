// מודל אחיד לכל המקורות. כל מקור (אמי"ת / Classroom / דמה) ממיר את הנתונים שלו לטיפוסים האלה.

export type Source = 'amit' | 'classroom' | 'mock';

export const SOURCE_LABEL: Record<Source, string> = {
  amit: 'אמי"ת',
  classroom: 'Classroom',
  mock: 'דמה',
};

export type TaskStatus = 'open' | 'submitted' | 'graded' | 'late' | 'missing';

export interface Task {
  /** מזהה יציב: `${source}:${externalId}` */
  id: string;
  source: Source;
  courseName: string;
  title: string;
  description: string | null;
  /** ISO date string או null אם אין דדליין */
  dueAt: string | null;
  status: TaskStatus;
  grade: number | null;
  maxGrade: number | null;
  teacherComment: string | null;
  /** קישור לדף המשימה באתר המקורי */
  url: string | null;
}

export interface Grade {
  id: string;
  source: Source;
  courseName: string;
  title: string;
  score: number;
  maxScore: number;
  /** ISO date string */
  date: string | null;
  comment: string | null;
}

/** הודעה / הערה כללית של מורה (Announcements ב-Classroom) */
export interface Note {
  id: string;
  source: Source;
  courseName: string;
  text: string;
  date: string | null;
  url: string | null;
}

export interface Snapshot {
  tasks: Task[];
  grades: Grade[];
  notes: Note[];
}

export type SyncEvent =
  | { kind: 'newTask'; task: Task }
  | { kind: 'newGrade'; courseName: string; title: string; score: number; maxScore: number; taskId?: string }
  | { kind: 'newComment'; courseName: string; title: string; text: string; taskId?: string };

export const isDone = (t: Task) => t.status === 'submitted' || t.status === 'graded';

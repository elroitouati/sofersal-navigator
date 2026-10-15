// השוואת תמונת מצב חדשה לקודמת כדי לגלות מה חדש. פונקציה טהורה – נבדקת ב-tests/diff.test.ts.
import type { Snapshot, SyncEvent } from '@/models/types';

export function diffSnapshots(prev: Snapshot, next: Snapshot): SyncEvent[] {
  const events: SyncEvent[] = [];
  const prevTasks = new Map(prev.tasks.map((t) => [t.id, t]));
  const prevGrades = new Set(prev.grades.map((g) => g.id));
  const prevNotes = new Set(prev.notes.map((n) => n.id));
  const gradedTaskIds = new Set<string>();

  for (const t of next.tasks) {
    const old = prevTasks.get(t.id);
    if (!old) {
      events.push({ kind: 'newTask', task: t });
      continue;
    }
    if (t.grade !== null && t.grade !== old.grade) {
      gradedTaskIds.add(t.id);
      events.push({
        kind: 'newGrade', courseName: t.courseName, title: t.title,
        score: t.grade, maxScore: t.maxGrade ?? 100, taskId: t.id,
      });
    }
    const comment = t.teacherComment?.trim();
    if (comment && comment !== old.teacherComment?.trim()) {
      events.push({ kind: 'newComment', courseName: t.courseName, title: t.title, text: comment, taskId: t.id });
    }
  }

  for (const g of next.grades) {
    if (prevGrades.has(g.id)) continue;
    // ציון שכבר דווח דרך המשימה עצמה – לא מדווחים פעמיים
    if (gradedTaskIds.has(g.id)) continue;
    events.push({ kind: 'newGrade', courseName: g.courseName, title: g.title, score: g.score, maxScore: g.maxScore });
  }

  for (const n of next.notes) {
    if (prevNotes.has(n.id)) continue;
    events.push({ kind: 'newComment', courseName: n.courseName, title: 'הודעה חדשה', text: n.text });
  }

  return events;
}

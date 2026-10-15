// נתוני דמה – כדי לראות את הממשק עובד לפני שמחברים חשבון אמיתי.
import type { Grade, Note, Snapshot, Task } from '@/models/types';

function at(daysFromNow: number, hour = 23, minute = 59): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

type T = Omit<Task, 'id' | 'source' | 'description' | 'url' | 'grade' | 'maxGrade' | 'teacherComment'> &
  Partial<Pick<Task, 'description' | 'grade' | 'maxGrade' | 'teacherComment'>>;

const raw: (T & { key: string })[] = [
  { key: 'm1', courseName: 'מתמטיקה', title: 'דף עבודה – משוואות ריבועיות', dueAt: at(-2), status: 'missing',
    description: 'פתרו את תרגילים 1–12 בעמוד 84. בתרגילים 9–12 יש להשתמש בנוסחת השורשים ולבדוק את הפתרון בהצבה.' },
  { key: 'e1', courseName: 'אנגלית', title: 'Essay: My favorite book', dueAt: at(0, 22, 0), status: 'open',
    description: 'Write a 150–200 word essay about your favorite book. Include: plot summary, main character, and why you recommend it.' },
  { key: 'h1', courseName: 'היסטוריה', title: 'שאלות על המהפכה הצרפתית', dueAt: at(1), status: 'open',
    description: 'ענו על שאלות 1–5 מתוך הפרק "המהפכה הצרפתית" בספר. כל תשובה 4–6 שורות.' },
  { key: 'p1', courseName: 'פיזיקה', title: 'מעבדה: נפילה חופשית – דוח', dueAt: at(3), status: 'open',
    description: 'כתבו דוח מעבדה: מטרה, מהלך, טבלת תוצאות, גרף מהירות-זמן ומסקנות. חשבו את תאוצת הנפילה מהנתונים.' },
  { key: 't1', courseName: 'תנ"ך', title: 'עבודה על ספר שמואל', dueAt: at(5), status: 'open',
    description: 'השוו בין דמותו של שאול לדמותו של דוד לפי פרקים ט"ו–ט"ז. היקף: עמוד וחצי.' },
  { key: 'l1', courseName: 'ספרות', title: 'ניתוח שיר – "אל הציפור"', dueAt: at(9), status: 'open',
    description: 'נתחו את השיר "אל הציפור" של ביאליק: דוברים, אמצעים אומנותיים, ומשמעות הגעגוע לארץ ישראל.' },
  { key: 'c1', courseName: 'כימיה', title: 'תרגול מול – שיעורי בית', dueAt: at(-6), status: 'graded',
    grade: 92, maxGrade: 100, teacherComment: 'עבודה מצוינת! שים לב ליחידות בתרגיל 4.',
    description: 'תרגילים 1–10 בנושא מול ומסה מולרית.' },
  { key: 'm2', courseName: 'מתמטיקה', title: 'בוחן בית – פונקציות', dueAt: at(-4), status: 'graded',
    grade: 78, maxGrade: 100, teacherComment: 'חסרים שלבי ביניים בשאלה 3. כדאי לחזור על תחום הגדרה.' },
  { key: 'e2', courseName: 'אנגלית', title: 'Vocabulary unit 4', dueAt: at(-1), status: 'submitted' },
  { key: 'b1', courseName: 'ביולוגיה', title: 'סיכום פרק התא', dueAt: null, status: 'open',
    description: 'סכמו את פרק 2 – מבנה התא: אברונים ותפקידם. מומלץ טבלה.' },
];

export function mockSnapshot(): Snapshot {
  const tasks: Task[] = raw.map(({ key, ...t }) => ({
    id: `mock:${key}`,
    source: 'mock',
    description: null,
    url: null,
    grade: null,
    maxGrade: null,
    teacherComment: null,
    ...t,
  }));

  const grades: Grade[] = [
    ...tasks
      .filter((t) => t.grade !== null)
      .map((t) => ({
        id: t.id, source: 'mock' as const, courseName: t.courseName, title: t.title,
        score: t.grade!, maxScore: t.maxGrade ?? 100, date: t.dueAt, comment: t.teacherComment,
      })),
    { id: 'mock:g1', source: 'mock', courseName: 'מתמטיקה', title: 'מבחן – אלגברה', score: 85, maxScore: 100, date: at(-20), comment: null },
    { id: 'mock:g2', source: 'mock', courseName: 'אנגלית', title: 'Reading test', score: 94, maxScore: 100, date: at(-15), comment: 'Great job' },
    { id: 'mock:g3', source: 'mock', courseName: 'היסטוריה', title: 'מבחן – תקופת הנאורות', score: 71, maxScore: 100, date: at(-12), comment: null },
    { id: 'mock:g4', source: 'mock', courseName: 'פיזיקה', title: 'בוחן קינמטיקה', score: 88, maxScore: 100, date: at(-9), comment: null },
    { id: 'mock:g5', source: 'mock', courseName: 'תנ"ך', title: 'מבחן – ספר שופטים', score: 90, maxScore: 100, date: at(-25), comment: null },
    { id: 'mock:g6', source: 'mock', courseName: 'ספרות', title: 'עבודה – סיפור קצר', score: 17, maxScore: 20, date: at(-7), comment: null },
  ];

  const notes: Note[] = [
    { id: 'mock:n1', source: 'mock', courseName: 'פיזיקה', text: 'מחר השיעור מתקיים במעבדה בקומה 2. להביא מחשבון.', date: at(0, 8, 15), url: null },
    { id: 'mock:n2', source: 'mock', courseName: 'מתמטיקה', text: 'המבחן נדחה ליום חמישי הבא. החומר: פרקים 3–5.', date: at(-1, 17, 40), url: null },
  ];

  return { tasks, grades, notes };
}

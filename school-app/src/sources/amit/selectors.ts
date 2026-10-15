// ⭐ כל מה שתלוי במבנה האתר של אמי"ת נמצא כאן.
// כשהאתר משתנה – מעדכנים רק את הקובץ הזה (ולפעמים את tests/fixtures).
//
// אם selector ריק (''), הפרסר משתמש בזיהוי אוטומטי: מחפש טבלאות/רשימות
// שהכותרות שלהן מתאימות לביטויים ב-HEADER_PATTERNS.

export const AMIT_SELECTORS = {
  taskList: {
    /** כל שורה = משימה אחת. למשל: 'table.assignments tbody tr' */
    row: '',
    subject: '',
    title: '',
    due: '',
    status: '',
    grade: '',
    comment: '',
    /** אלמנט <a> שמוביל לדף המשימה */
    link: '',
  },
  taskPage: {
    description: '',
    teacherComment: '',
    grade: '',
  },
  grades: {
    row: '',
    subject: '',
    title: '',
    score: '',
    date: '',
    comment: '',
  },
};

/** זיהוי עמודות לפי טקסט הכותרת (לזיהוי האוטומטי) */
export const HEADER_PATTERNS = {
  subject: /מקצוע|קורס|שיעור|כיתה\s*לימוד/,
  title: /משימה|שם|נושא|כותרת|מטלה|פעילות|עבודה/,
  due: /הגשה|תאריך\s*יעד|מועד|דדליין|עד\s*תאריך|תאריך\s*סיום/,
  date: /תאריך/,
  status: /סטטוס|מצב|הוגש/,
  grade: /ציון|ניקוד|נקודות/,
  comment: /הערה|הערות|משוב|הערת\s*מורה/,
};

/** מיפוי טקסט סטטוס לסטטוס פנימי */
export const STATUS_PATTERNS: [RegExp, 'open' | 'submitted' | 'graded' | 'late' | 'missing'][] = [
  [/לא\s*הוגש|טרם\s*הוגש|חסר/, 'missing'],
  [/באיחור|איחור/, 'late'],
  [/נבדק|קיבל\s*ציון|הוחזר/, 'graded'],
  [/הוגש|הושלם|בוצע|הסתיים/, 'submitted'],
  [/פתוח|חדש|בתהליך|טרם|ממתין/, 'open'],
];

/** סימנים לכך שהדף שקיבלנו הוא דף התחברות (פג תוקף הסשן) */
export const LOGIN_PAGE_HINTS = [/type=["']?password/i, /התחברות|כניסה\s*למערכת|שם\s*משתמש/];

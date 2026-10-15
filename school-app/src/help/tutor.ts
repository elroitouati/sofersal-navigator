// עוזר משימות מבוסס Claude. הקריאה יוצאת ישירות מהטלפון ל-Anthropic עם המפתח שלך (שמור ב-SecureStore).
// נשלחים רק: תוכן המשימה ומה שאתה כותב. שום סיסמה או פרטי התחברות.
import Anthropic from '@anthropic-ai/sdk';
import type { Task } from '@/models/types';
import { getAnthropicKey } from '@/secure/store';
import { formatDate } from '@/util/date';

export type HelpMode = 'hint' | 'explain' | 'solve' | 'chat';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

const MODEL = 'claude-opus-5-5';

const SYSTEM = `אתה מורה פרטי סבלני ומעודד לתלמיד תיכון בישראל. ענה תמיד בעברית (חוץ ממשימות באנגלית – שם הסבר בעברית ודוגמאות באנגלית), בלשון זכר.
כתוב בצורה ברורה וקצרה, עם שלבים ממוספרים כשצריך. נוסחאות מתמטיות כתוב בטקסט פשוט (למשל x^2, sqrt(5)), בלי LaTeX.
המטרה היא שהתלמיד יבין ויצליח לבד – אבל כשהוא מבקש פתרון מלא, תן אותו במלואו עם הסבר לכל שלב.
אם חסר לך מידע על המשימה (למשל התרגיל עצמו מופיע בספר ולא בטקסט), אמור זאת ובקש מהתלמיד להעתיק את השאלה.`;

const MODE_PROMPT: Record<Exclude<HelpMode, 'chat'>, string> = {
  hint: 'תן לי רמז אחד קטן שיעזור לי להתקדם – בלי לגלות את התשובה. אם כבר קיבלתי רמזים, תן רמז הבא שמקדם קצת יותר.',
  explain: 'תסביר לי את החומר שהמשימה הזאת עוסקת בו, עם דוגמה פשוטה משלך (לא את התשובה למשימה עצמה).',
  solve: 'ניסיתי ולא הצלחתי. תראה לי את הפתרון המלא, שלב אחרי שלב, עם הסבר למה עושים כל שלב. בסוף תן לי שאלה דומה קצרה לתרגול.',
};

export const MODE_LABEL: Record<Exclude<HelpMode, 'chat'>, string> = {
  hint: '💡 רמז',
  explain: '🧭 הסבר את החומר',
  solve: '😩 לא הצלחתי – תראה לי פתרון',
};

export class TutorError extends Error {}

function taskContext(t: Task): string {
  return [
    `מקצוע: ${t.courseName}`,
    `משימה: ${t.title}`,
    t.dueAt ? `תאריך הגשה: ${formatDate(t.dueAt)}` : null,
    t.description ? `תוכן המשימה:\n${t.description}` : 'אין תיאור מפורט למשימה.',
    t.teacherComment ? `הערת המורה: ${t.teacherComment}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function promptFor(mode: HelpMode, text?: string): string {
  return mode === 'chat' ? (text ?? '') : MODE_PROMPT[mode];
}

export async function askTutor(task: Task, history: ChatTurn[], mode: HelpMode): Promise<string> {
  const apiKey = await getAnthropicKey();
  if (!apiKey) throw new TutorError('כדי להשתמש בעזרה צריך מפתח API של Anthropic. הוסף אותו בהגדרות ← עזרה במשימות.');

  // ב-React Native אין סביבת דפדפן אמיתית; המפתח שייך לך ונשמר מוצפן במכשיר שלך בלבד.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((h, i) => ({
    role: h.role,
    content: i === 0 && h.role === 'user' ? `${taskContext(task)}\n\n---\n${h.text}` : h.text,
  }));

  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages,
      output_config: { effort: mode === 'solve' ? 'medium' : 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });

    if (res.stop_reason === 'refusal') {
      throw new TutorError('העוזר לא יכול לענות על הבקשה הזאת. נסה לנסח אחרת.');
    }
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    if (!text) throw new TutorError('לא התקבלה תשובה. נסה שוב.');
    return text;
  } catch (e) {
    if (e instanceof TutorError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new TutorError('מפתח ה-API לא תקין. בדוק אותו בהגדרות.');
    if (e instanceof Anthropic.RateLimitError) throw new TutorError('יותר מדי בקשות. חכה רגע ונסה שוב.');
    if (e instanceof Anthropic.APIConnectionError) throw new TutorError('אין חיבור לאינטרנט.');
    if (e instanceof Anthropic.APIError) throw new TutorError(`שגיאה מהשרת (${e.status ?? '?'}). נסה שוב.`);
    throw new TutorError(e instanceof Error ? e.message : String(e));
  }
}

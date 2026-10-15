// צבע קבוע לכל מקצוע. מקצועות מוכרים מקבלים צבע ידוע, השאר – לפי hash של השם (תמיד אותו צבע).

const PALETTE = [
  '#4F46E5', '#DB2777', '#059669', '#D97706', '#7C3AED', '#0891B2',
  '#DC2626', '#65A30D', '#2563EB', '#C026D3', '#EA580C', '#0D9488',
];

const KNOWN: [RegExp, string][] = [
  [/מתמטיק|חשבון|math/i, '#2563EB'],
  [/אנגלית|english/i, '#DC2626'],
  [/היסטוריה/, '#D97706'],
  [/פיזיקה/, '#7C3AED'],
  [/כימיה/, '#0891B2'],
  [/ביולוגיה/, '#059669'],
  [/תנ"?ך|תנ״ך/, '#92400E'],
  [/ספרות/, '#DB2777'],
  [/לשון|עברית/, '#C026D3'],
  [/אזרחות/, '#0D9488'],
  [/גמרא|תלמוד|משנה/, '#65A30D'],
  [/מחשב|תכנות|סייבר/, '#4F46E5'],
  [/ערבית/, '#EA580C'],
  [/חינוך גופני|ספורט/, '#16A34A'],
];

export function subjectColor(name: string): string {
  for (const [re, color] of KNOWN) if (re.test(name)) return color;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

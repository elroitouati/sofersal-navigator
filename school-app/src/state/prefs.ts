import { kvGetJson, kvSetJson } from '@/db/db';

export interface Prefs {
  notifyNewTask: boolean;
  notifyDeadline: boolean;
  notifyGrade: boolean;
  /** מציג נתוני דמה. נכבה אוטומטית כשמחברים חשבון אמיתי. */
  demoMode: boolean;
  backgroundSync: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  notifyNewTask: true,
  notifyDeadline: true,
  notifyGrade: true,
  demoMode: true,
  backgroundSync: true,
};

export const getPrefs = async (): Promise<Prefs> => ({ ...DEFAULT_PREFS, ...(await kvGetJson<Partial<Prefs>>('prefs', {})) });

export async function setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const next = { ...(await getPrefs()), ...patch };
  await kvSetJson('prefs', next);
  return next;
}

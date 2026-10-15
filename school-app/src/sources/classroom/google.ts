// התחברות ל-Google עם הרשאות קריאה בלבד ל-Classroom.
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
];

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ scopes: CLASSROOM_SCOPES });
  configured = true;
}

export class ClassroomAuthError extends Error {}

/** מתורגם להודעה ברורה בעברית */
export function explainGoogleError(e: unknown): string {
  if (isErrorWithCode(e)) {
    switch (e.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return 'ההתחברות בוטלה.';
      case statusCodes.IN_PROGRESS:
        return 'התחברות כבר מתבצעת.';
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Google Play Services לא זמין במכשיר.';
    }
    if (String(e.code) === '10' || /DEVELOPER_ERROR/i.test(String(e.message))) {
      return 'שגיאת הגדרה (DEVELOPER_ERROR): טביעת האצבע SHA-1 או שם החבילה לא נרשמו ב-Google Cloud. ראה BUILD.md, שלב Google.';
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/admin_policy|access_denied|blocked|disallowed/i.test(msg)) {
    return 'חשבון בית הספר חוסם אפליקציות חיצוניות. בקש ממנהל המערכת (רכז התקשוב) לאשר את האפליקציה, או נסה חשבון Google אחר.';
  }
  return `שגיאה בהתחברות ל-Google: ${msg}`;
}

export async function signInToGoogle(): Promise<string> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success') throw new ClassroomAuthError('ההתחברות בוטלה.');
  return res.data.user.email;
}

/** משמש גם ברקע – בלי UI */
export async function getAccessToken(): Promise<string | null> {
  ensureConfigured();
  if (!GoogleSignin.hasPreviousSignIn()) return null;
  const silent = await GoogleSignin.signInSilently();
  if (silent.type !== 'success') return null;
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}

export async function refreshAccessToken(oldToken: string): Promise<string | null> {
  await GoogleSignin.clearCachedAccessToken(oldToken);
  return getAccessToken();
}

export function currentGoogleEmail(): string | null {
  ensureConfigured();
  return GoogleSignin.getCurrentUser()?.user.email ?? null;
}

export async function signOutGoogle(): Promise<void> {
  ensureConfigured();
  try {
    await GoogleSignin.revokeAccess();
  } catch {}
  await GoogleSignin.signOut();
}

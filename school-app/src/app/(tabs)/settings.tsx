import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { Button, Card, Divider, Row, Screen, SectionTitle, T, Toggle } from '@/components/ui';
import { wipeDatabase } from '@/db/db';
import { SOURCE_LABEL, type Source } from '@/models/types';
import { cancelAllNotifications } from '@/notify/notify';
import { clearAllSecrets, clearAmitCredentials, clearAnthropicKey, getAmitCredentials, getAnthropicKey, setAnthropicKey } from '@/secure/store';
import { getAmitConfig, updateAmitConfig } from '@/sources/amit/amitSource';
import { currentGoogleEmail, explainGoogleError, signInToGoogle, signOutGoogle } from '@/sources/classroom/google';
import { useData } from '@/state/DataContext';
import { DEFAULT_PREFS, getPrefs, setPrefs, type Prefs } from '@/state/prefs';
import { setBackgroundSync } from '@/sync/background';
import { forgetSource, getSourceStatus, type SourceStatus } from '@/sync/engine';
import { useTheme } from '@/theme/theme';
import { relativeAgo } from '@/util/date';

export default function SettingsScreen() {
  const t = useTheme();
  const { sync, syncing, lastSync, reload } = useData();
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [status, setStatus] = useState<SourceStatus>({});
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [amit, setAmit] = useState<{ user: string | null; tasksUrl: string | null }>({ user: null, tasksUrl: null });
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [p, s, creds, cfg, key] = await Promise.all([getPrefs(), getSourceStatus(), getAmitCredentials(), getAmitConfig(), getAnthropicKey()]);
    setPrefsState(p);
    setStatus(s);
    setAmit({ user: creds?.username ?? null, tasksUrl: cfg.tasksUrl });
    setHasKey(!!key);
    try {
      setGoogleEmail(currentGoogleEmail());
    } catch {
      setGoogleEmail(null);
    }
  }, []);

  useFocusEffect(useCallback(() => void refresh(), [refresh, lastSync]));

  const updatePrefs = async (patch: Partial<Prefs>) => {
    setPrefsState(await setPrefs(patch));
    if (patch.backgroundSync !== undefined) await setBackgroundSync(patch.backgroundSync).catch(() => {});
    if (patch.demoMode !== undefined || patch.notifyDeadline !== undefined) await sync();
  };

  const connectGoogle = async () => {
    setGoogleBusy(true);
    try {
      const email = await signInToGoogle();
      setGoogleEmail(email);
      await setPrefs({ demoMode: false });
      await sync();
      await refresh();
    } catch (e) {
      Alert.alert('Google Classroom', explainGoogleError(e));
    } finally {
      setGoogleBusy(false);
    }
  };

  const disconnectGoogle = () =>
    Alert.alert('ניתוק Classroom', 'הנתונים מ-Classroom יימחקו מהטלפון.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'נתק', style: 'destructive', onPress: async () => {
          await signOutGoogle().catch(() => {});
          await forgetSource('classroom');
          await reload();
          await refresh();
        },
      },
    ]);

  const disconnectAmit = () =>
    Alert.alert('ניתוק אמי"ת', 'שם המשתמש והסיסמה והנתונים מאמי"ת יימחקו מהטלפון.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'נתק', style: 'destructive', onPress: async () => {
          await clearAmitCredentials();
          await updateAmitConfig({ tasksUrl: null, gradesUrl: null, loginUrl: null });
          await forgetSource('amit');
          await reload();
          await refresh();
        },
      },
    ]);

  const saveKey = async () => {
    if (!keyInput.trim().startsWith('sk-ant-')) {
      Alert.alert('מפתח לא תקין', 'מפתח API של Anthropic מתחיל ב-sk-ant-');
      return;
    }
    await setAnthropicKey(keyInput);
    setKeyInput('');
    setHasKey(true);
  };

  const wipeAll = () =>
    Alert.alert('מחיקת כל הנתונים', 'כל המשימות, הציונים, הסיסמאות וההגדרות יימחקו מהטלפון. לא ניתן לבטל.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק הכל', style: 'destructive', onPress: async () => {
          await signOutGoogle().catch(() => {});
          await clearAllSecrets();
          await cancelAllNotifications();
          await wipeDatabase();
          await reload();
          await refresh();
        },
      },
    ]);

  const statusLine = (s: Source) => {
    const st = status[s];
    if (!st) return 'עוד לא סונכרן';
    return st.ok ? `✅ סונכרן ${relativeAgo(st.at)}` : `⚠️ ${st.error}`;
  };

  return (
    <Screen title="הגדרות">
      <SectionTitle>🔄 סנכרון</SectionTitle>
      <Card>
        <Row label="סנכרון אחרון" sub={relativeAgo(lastSync)} />
        <Button label={syncing ? 'מסנכרן…' : 'סנכרן עכשיו'} onPress={sync} loading={syncing} />
        <Divider />
        <Toggle
          label="סנכרון אוטומטי ברקע"
          sub="בערך כל 30 דקות (אנדרואיד קובע את הזמן המדויק)"
          value={prefs.backgroundSync}
          onChange={(v) => updatePrefs({ backgroundSync: v })}
        />
      </Card>

      <SectionTitle>👤 חשבונות</SectionTitle>
      <Card style={{ gap: 6 }}>
        <Row
          label="רשת אמי״ת"
          sub={amit.user ? `${amit.user} · ${amit.tasksUrl ? statusLine('amit') : 'צריך לסמן את דף המשימות'}` : 'לא מחובר'}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button style={{ flex: 1 }} label={amit.user ? 'פתח / עדכן' : 'התחבר'} onPress={() => router.push('/login/amit')} />
          {amit.user ? <Button style={{ flex: 1 }} kind="secondary" label="נתק" onPress={disconnectAmit} /> : null}
        </View>
        <Divider />
        <Row label="Google Classroom" sub={googleEmail ? `${googleEmail} · ${statusLine('classroom')}` : 'לא מחובר'} />
        {googleEmail ? (
          <Button kind="secondary" label="נתק" onPress={disconnectGoogle} />
        ) : (
          <Button label="התחבר עם Google" onPress={connectGoogle} loading={googleBusy} />
        )}
        <Divider />
        <Toggle
          label="נתוני דמה"
          sub="להצגת הממשק לפני חיבור חשבון אמיתי"
          value={prefs.demoMode}
          onChange={(v) => updatePrefs({ demoMode: v })}
        />
      </Card>

      <SectionTitle>🔔 התראות</SectionTitle>
      <Card>
        <Toggle label="משימה חדשה" sub="מקצוע, שם ודדליין" value={prefs.notifyNewTask} onChange={(v) => updatePrefs({ notifyNewTask: v })} />
        <Divider />
        <Toggle label="יום לפני דדליין" sub="רק למשימות שעוד לא הוגשו" value={prefs.notifyDeadline} onChange={(v) => updatePrefs({ notifyDeadline: v })} />
        <Divider />
        <Toggle label="ציון או הערת מורה חדשים" value={prefs.notifyGrade} onChange={(v) => updatePrefs({ notifyGrade: v })} />
      </Card>

      <SectionTitle>🤖 עזרה במשימות</SectionTitle>
      <Card style={{ gap: 8 }}>
        <T dim size={13}>
          העזרה עובדת עם Claude. צריך מפתח API מ-console.anthropic.com (בתשלום לפי שימוש, בערך כמה סנטים לשאלה).
          המפתח נשמר מוצפן בטלפון. לעוזר נשלחים רק תוכן המשימה ומה שאתה כותב.
        </T>
        {hasKey ? (
          <Row
            label="✅ מפתח שמור"
            right={<Button kind="secondary" label="הסר" onPress={async () => { await clearAnthropicKey(); setHasKey(false); }} />}
          />
        ) : (
          <>
            <TextInput
              value={keyInput}
              onChangeText={setKeyInput}
              placeholder="sk-ant-..."
              placeholderTextColor={t.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={{ backgroundColor: t.cardAlt, color: t.text, borderRadius: 12, padding: 12, textAlign: 'left', writingDirection: 'ltr' }}
            />
            <Button label="שמור מפתח" onPress={saveKey} disabled={!keyInput} />
          </>
        )}
      </Card>

      <SectionTitle>🗑️ פרטיות</SectionTitle>
      <Card style={{ gap: 8 }}>
        <T dim size={13}>
          כל הנתונים נשמרים רק בטלפון. הסיסמה לאמי"ת נשלחת רק לאתר של אמי"ת. האפליקציה רק קוראת – לא מגישה ולא משנה כלום.
        </T>
        <Button kind="danger" label="התנתקות ומחיקת כל הנתונים" onPress={wipeAll} />
      </Card>
      <T dim size={11} style={{ textAlign: 'center' }}>מקורות: {Object.keys(status).map((s) => SOURCE_LABEL[s as Source]).join(', ') || '—'}</T>
    </Screen>
  );
}

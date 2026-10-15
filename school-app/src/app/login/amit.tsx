// מסך חיבור לאמי"ת: שם משתמש + סיסמה (נשמרים מוצפנים), ודפדפן מובנה שבו:
//  1. הסיסמה ממולאת אוטומטית בטופס ההתחברות (אתה לוחץ "כניסה" – או שהאתר נכנס לבד)
//  2. אתה מנווט: למידה ← תלמיד ← המשימות, ולוחץ "📌 זה דף המשימות" (ואותו דבר לציונים)
//  3. כפתור "📤 שלח את הדף" שומר את ה-HTML (בלי סיסמאות) ופותח שיתוף – כדי לבנות פרסר מדויק
// הדפדפן מוגן: כל ניסיון להגיש/לשלוח טופס שאינו טופס התחברות נחסם.
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { Button, Card, T } from '@/components/ui';
import { getAmitCredentials, setAmitCredentials } from '@/secure/store';
import { getAmitConfig, updateAmitConfig, type AmitConfig } from '@/sources/amit/amitSource';
import { parseGrades, parseTaskList } from '@/sources/amit/parse';
import { autofillScript, CAPTURE_HTML_SCRIPT, GUARD_SCRIPT } from '@/sources/amit/webScripts';
import { useData } from '@/state/DataContext';
import { setPrefs } from '@/state/prefs';
import { useTheme } from '@/theme/theme';

type Pending = 'share' | 'tasks' | 'grades' | null;

export default function AmitLogin() {
  const t = useTheme();
  const { sync } = useData();
  const web = useRef<WebView>(null);
  const pending = useRef<Pending>(null);
  const [stage, setStage] = useState<'creds' | 'browser'>('creds');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cfg, setCfg] = useState<AmitConfig | null>(null);
  const [url, setUrl] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [creds, c] = await Promise.all([getAmitCredentials(), getAmitConfig()]);
      if (creds) {
        setUsername(creds.username);
        setPassword(creds.password);
      }
      setCfg(c);
    })();
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const startBrowser = async () => {
    if (!username || !password) return Alert.alert('אמי"ת', 'צריך שם משתמש וסיסמה');
    await setAmitCredentials({ username, password });
    setStage('browser');
  };

  const capture = (what: Pending) => {
    pending.current = what;
    web.current?.injectJavaScript(CAPTURE_HTML_SCRIPT);
  };

  const onMessage = async (e: WebViewMessageEvent) => {
    let msg: { type: string; url?: string; html?: string; title?: string; msg?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'blocked') {
      flash('🔒 האפליקציה במצב קריאה בלבד – הגשה רק דרך האתר עצמו.');
    } else if (msg.type === 'loginPage' && msg.url) {
      setCfg(await updateAmitConfig({ loginUrl: msg.url }));
    } else if (msg.type === 'html' && msg.html && msg.url) {
      const what = pending.current;
      pending.current = null;
      if (what === 'share') await shareHtml(msg.html, msg.title ?? 'amit');
      if (what === 'tasks') {
        const found = parseTaskList(msg.html, msg.url).length;
        setCfg(await updateAmitConfig({ tasksUrl: msg.url }));
        await setPrefs({ demoMode: false });
        Alert.alert(
          'דף המשימות נשמר',
          found
            ? `זוהו ${found} משימות בדף. 🎉`
            : 'הדף נשמר, אבל עוד לא זוהו בו משימות אוטומטית. לחץ "📤 שלח את הדף" ושלח לי את הקובץ כדי שאתאים את הפרסר.',
        );
      }
      if (what === 'grades') {
        const found = parseGrades(msg.html, msg.url).length;
        setCfg(await updateAmitConfig({ gradesUrl: msg.url }));
        Alert.alert('דף הציונים נשמר', found ? `זוהו ${found} ציונים. 🎉` : 'עוד לא זוהו ציונים אוטומטית – שלח לי את הדף.');
      }
    }
  };

  const shareHtml = async (html: string, title: string) => {
    const safe = title.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'page';
    const file = new File(Paths.cache, `amit_${safe}_${Date.now()}.html`);
    file.write(html);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/html', dialogTitle: 'שלח את הדף' });
  };

  const finish = async () => {
    router.back();
    await sync();
  };

  if (stage === 'creds' || !cfg) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior="padding">
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Card style={{ gap: 10 }}>
            <T weight="700" size={17}>פרטי התחברות לאמי"ת</T>
            <T dim size={13}>נשמרים מוצפנים בטלפון (Android Keystore) ונשלחים רק לאתר של אמי"ת.</T>
            <Input value={username} onChangeText={setUsername} placeholder="שם משתמש" />
            <Input value={password} onChangeText={setPassword} placeholder="סיסמה" secure />
            <Button label="המשך" onPress={startBrowser} disabled={!username || !password} />
          </Card>
          <Card style={{ gap: 6 }}>
            <T weight="700">מה יקרה עכשיו?</T>
            <T dim size={13}>1. ייפתח האתר של אמי"ת. נווט: למידה ← תלמיד.</T>
            <T dim size={13}>2. הסיסמה תמולא לבד בטופס ההתחברות – רק לחץ כניסה.</T>
            <T dim size={13}>3. כשאתה בדף המשימות לחץ "📌 משימות". אם יש דף ציונים, לחץ שם "📌 ציונים".</T>
            <T dim size={13}>4. לחץ "סיום". מעכשיו הכל מתעדכן לבד.</T>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 8, gap: 6, backgroundColor: t.card, borderBottomWidth: 1, borderColor: t.border }}>
        <T dim size={11} numberOfLines={1} style={{ writingDirection: 'ltr' }}>{url}</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Button label={`📌 משימות${cfg.tasksUrl ? ' ✓' : ''}`} onPress={() => capture('tasks')} />
          <Button kind="secondary" label={`📌 ציונים${cfg.gradesUrl ? ' ✓' : ''}`} onPress={() => capture('grades')} />
          <Button kind="secondary" label="📤 שלח את הדף" onPress={() => capture('share')} />
          <Button kind="secondary" label="↩︎ אחורה" onPress={() => web.current?.goBack()} />
          <Button label="סיום" onPress={finish} />
        </ScrollView>
      </View>
      <WebView
        ref={web}
        source={{ uri: cfg.tasksUrl ?? cfg.startUrl }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        injectedJavaScriptBeforeContentLoaded={GUARD_SCRIPT}
        injectedJavaScript={GUARD_SCRIPT + autofillScript(username, password)}
        injectedJavaScriptForMainFrameOnly={false}
        onMessage={onMessage}
        onNavigationStateChange={(s) => setUrl(s.url)}
        style={{ flex: 1 }}
      />
      {toast ? (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: t.text, borderRadius: 14, padding: 12 }}>
          <T style={{ color: t.bg }}>{toast}</T>
        </View>
      ) : null}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, secure }: { value: string; onChangeText: (s: string) => void; placeholder: string; secure?: boolean }) {
  const t = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.muted}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
      style={{ backgroundColor: t.cardAlt, color: t.text, borderRadius: 12, padding: 12 }}
    />
  );
}

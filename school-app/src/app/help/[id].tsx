import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Empty, T } from '@/components/ui';
import { askTutor, MODE_LABEL, promptFor, type ChatTurn, type HelpMode } from '@/help/tutor';
import { useData } from '@/state/DataContext';
import { subjectColor } from '@/theme/subjects';
import { useTheme } from '@/theme/theme';

export default function HelpScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useData().tasks.find((x) => x.id === id);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  if (!task) return <Empty emoji="🔍" text="המשימה לא נמצאה" />;

  const ask = async (mode: HelpMode, text?: string) => {
    const userText = promptFor(mode, text);
    if (!userText.trim() || busy) return;
    const next: ChatTurn[] = [...history, { role: 'user', text: userText }];
    setHistory(next);
    setInput('');
    setError(null);
    setBusy(true);
    try {
      const answer = await askTutor(task, next, mode);
      setHistory([...next, { role: 'assistant', text: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHistory(history); // מחזירים את השאלה כדי שאפשר יהיה לנסות שוב
      if (mode === 'chat') setInput(userText);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const sc = subjectColor(task.courseName);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior="padding">
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <T size={12} weight="700" style={{ color: sc }}>{task.courseName}</T>
          <T weight="700" size={16}>{task.title}</T>
        </Card>

        {history.length === 0 ? (
          <T dim style={{ textAlign: 'center', marginVertical: 8 }}>
            בחר איך לעזור לך, או כתוב שאלה משלך (למשל: "לא הבנתי את שאלה 3").
          </T>
        ) : null}

        {history.map((m, i) => (
          <View
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end',
              maxWidth: '92%',
              backgroundColor: m.role === 'user' ? t.primary : t.card,
              borderRadius: 18,
              padding: 12,
              borderWidth: m.role === 'user' ? 0 : 1,
              borderColor: t.border,
            }}
          >
            <T selectable style={{ color: m.role === 'user' ? t.primaryText : t.text, lineHeight: 22 }}>{m.text}</T>
          </View>
        ))}

        {busy ? (
          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-end', alignItems: 'center' }}>
            <ActivityIndicator color={t.primary} />
            <T dim>חושב…</T>
          </View>
        ) : null}

        {error ? (
          <Card style={{ borderColor: t.danger }}>
            <T style={{ color: t.danger }}>{error}</T>
            {/מפתח/.test(error) ? <Button kind="secondary" label="להגדרות" onPress={() => router.push('/settings')} style={{ marginTop: 8 }} /> : null}
          </Card>
        ) : null}
      </ScrollView>

      <View style={{ padding: 12, paddingBottom: insets.bottom + 12, gap: 8, borderTopWidth: 1, borderColor: t.border, backgroundColor: t.card }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(Object.keys(MODE_LABEL) as (keyof typeof MODE_LABEL)[]).map((mode) => (
            <Pressable
              key={mode}
              disabled={busy}
              onPress={() => ask(mode)}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: t.cardAlt, opacity: busy ? 0.5 : 1 }}
            >
              <T weight="600" size={14}>{mode === 'hint' && history.some((h) => h.role === 'assistant') ? '💡 עוד רמז' : MODE_LABEL[mode]}</T>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="כתוב שאלה…"
            placeholderTextColor={t.muted}
            multiline
            style={{ flex: 1, maxHeight: 120, backgroundColor: t.cardAlt, color: t.text, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}
          />
          <Button label="שלח" onPress={() => ask('chat', input)} disabled={!input.trim() || busy} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

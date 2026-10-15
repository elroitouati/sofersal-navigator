import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { Badge, Button, Card, Empty, Screen, T } from '@/components/ui';
import { SOURCE_LABEL } from '@/models/types';
import { useData } from '@/state/DataContext';
import { subjectColor } from '@/theme/subjects';
import { URGENCY_LABEL, urgencyColor, urgencyOf, useTheme } from '@/theme/theme';
import { formatDate, formatTime, relativeDue } from '@/util/date';

const STATUS_LABEL = { open: 'פתוחה', submitted: 'הוגשה', graded: 'נבדקה', late: 'הוגשה באיחור', missing: 'לא הוגשה' } as const;

export default function TaskScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks } = useData();
  const task = tasks.find((x) => x.id === id);

  if (!task) return <Screen><Empty emoji="🔍" text="המשימה לא נמצאה" /></Screen>;

  const u = urgencyOf(task);
  const sc = subjectColor(task.courseName);

  return (
    <>
      <Stack.Screen options={{ title: task.courseName }} />
      <Screen>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge label={task.courseName} color={sc} />
            <Badge label={URGENCY_LABEL[u]} color={urgencyColor(u, t)} />
            <T dim size={12}>{SOURCE_LABEL[task.source]}</T>
          </View>
          <T size={24} weight="800" selectable>{task.title}</T>
        </View>

        <Card style={{ gap: 10 }}>
          <Info label="דדליין" value={task.dueAt ? `${relativeDue(task.dueAt)} · ${formatDate(task.dueAt)} ${formatTime(task.dueAt)}` : 'ללא'} />
          <Info label="סטטוס" value={STATUS_LABEL[task.status]} />
          {task.grade !== null ? (
            <Info label="ציון" value={`${task.grade}${task.maxGrade ? ` מתוך ${task.maxGrade}` : ''}`} color={t.ok} />
          ) : null}
        </Card>

        {task.teacherComment ? (
          <Card style={{ borderColor: sc, backgroundColor: sc + '12' }}>
            <T weight="700" style={{ color: sc }}>💬 הערת המורה</T>
            <T selectable style={{ marginTop: 6, lineHeight: 22 }}>{task.teacherComment}</T>
          </Card>
        ) : null}

        <Card>
          <T weight="700">📄 תוכן המשימה</T>
          <T selectable style={{ marginTop: 6, lineHeight: 22 }} dim={!task.description}>
            {task.description ?? 'אין תיאור. אפשר לפתוח את המשימה באתר.'}
          </T>
        </Card>

        <Button label="🤖 עזרה במשימה (רמז / הסבר / פתרון)" onPress={() => router.push({ pathname: '/help/[id]', params: { id: task.id } })} />
        {task.url ? (
          <Button kind="secondary" label={`🔗 פתח ב${SOURCE_LABEL[task.source]}`} onPress={() => Linking.openURL(task.url!)} />
        ) : null}
      </Screen>
    </>
  );
}

function Info({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T dim>{label}</T>
      <T weight="700" style={color ? { color } : undefined}>{value}</T>
    </View>
  );
}

import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { TaskCard } from '@/components/TaskCard';
import { Card, Empty, Screen, SectionTitle, T } from '@/components/ui';
import { isDone, type Task } from '@/models/types';
import { useData } from '@/state/DataContext';
import { subjectColor } from '@/theme/subjects';
import { useTheme } from '@/theme/theme';
import { dayDiff, formatDate, relativeAgo } from '@/util/date';

const byDue = (a: Task, b: Task) => (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9');

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

export default function Dashboard() {
  const t = useTheme();
  const { tasks, grades, notes, sync, syncing, lastSync, lastErrors } = useData();

  const { overdue, today, week, open } = useMemo(() => {
    const now = Date.now();
    const openTasks = tasks.filter((x) => !isDone(x)).sort(byDue);
    return {
      open: openTasks,
      overdue: openTasks.filter((x) => x.dueAt && new Date(x.dueAt).getTime() < now),
      today: openTasks.filter((x) => x.dueAt && new Date(x.dueAt).getTime() >= now && dayDiff(x.dueAt) === 0),
      week: openTasks.filter((x) => x.dueAt && dayDiff(x.dueAt) >= 1 && dayDiff(x.dueAt) <= 7),
    };
  }, [tasks]);

  const recentGrades = useMemo(
    () => [...grades].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 4),
    [grades],
  );

  return (
    <Screen title={greeting()} subtitle={`סונכרן ${relativeAgo(lastSync)}`} refreshing={syncing} onRefresh={sync}>
      {lastErrors.length > 0 ? (
        <Card style={{ borderColor: t.danger, backgroundColor: t.danger + '14' }} onPress={() => router.push('/settings')}>
          <T weight="700" style={{ color: t.danger }}>⚠️ בעיה בסנכרון</T>
          {lastErrors.map((e, i) => (
            <T key={i} size={13}>{e}</T>
          ))}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat label="פתוחות" value={open.length} color={t.primary} onPress={() => router.push('/tasks')} />
        <Stat label="היום" value={today.length} color={t.warn} />
        <Stat label="באיחור" value={overdue.length} color={t.danger} />
      </View>

      {overdue.length > 0 ? (
        <>
          <SectionTitle>🔥 באיחור</SectionTitle>
          {overdue.map((x) => <TaskCard key={x.id} task={x} />)}
        </>
      ) : null}

      <SectionTitle>📌 להגשה היום</SectionTitle>
      {today.length ? today.map((x) => <TaskCard key={x.id} task={x} />) : <Empty emoji="🎉" text="אין הגשות היום" />}

      <SectionTitle>🗓️ השבוע</SectionTitle>
      {week.length ? week.map((x) => <TaskCard key={x.id} task={x} />) : <Empty emoji="😌" text="שבוע רגוע" />}

      {notes.length > 0 ? (
        <>
          <SectionTitle>📣 הודעות אחרונות</SectionTitle>
          {notes.slice(0, 3).map((n) => (
            <Card key={n.id}>
              <T size={12} weight="700" style={{ color: subjectColor(n.courseName) }}>{n.courseName} · {formatDate(n.date)}</T>
              <T numberOfLines={4} style={{ marginTop: 4 }}>{n.text}</T>
            </Card>
          ))}
        </>
      ) : null}

      <SectionTitle>🎯 ציונים אחרונים</SectionTitle>
      {recentGrades.length ? (
        <Card style={{ gap: 10 }} onPress={() => router.push('/grades')}>
          {recentGrades.map((g) => (
            <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: subjectColor(g.courseName) }} />
              <View style={{ flex: 1 }}>
                <T weight="600" numberOfLines={1}>{g.title}</T>
                <T dim size={12}>{g.courseName}</T>
              </View>
              <T size={18} weight="800">{Math.round((g.score / g.maxScore) * 100)}</T>
            </View>
          ))}
        </Card>
      ) : (
        <Empty emoji="📭" text="עוד אין ציונים" />
      )}
    </Screen>
  );
}

function Stat({ label, value, color, onPress }: { label: string; value: number; color: string; onPress?: () => void }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 16 }} onPress={onPress}>
      <T size={30} weight="800" style={{ color }}>{value}</T>
      <T dim size={13}>{label}</T>
    </Card>
  );
}

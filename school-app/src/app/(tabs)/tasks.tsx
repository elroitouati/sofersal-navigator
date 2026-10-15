import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TaskCard } from '@/components/TaskCard';
import { Chip, Empty, Screen, T } from '@/components/ui';
import { isDone, SOURCE_LABEL, type Source, type Task } from '@/models/types';
import { useData } from '@/state/DataContext';
import { subjectColor } from '@/theme/subjects';

type StatusFilter = 'open' | 'done' | 'all';

const byDue = (a: Task, b: Task) => (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9');

export default function TasksScreen() {
  const { tasks, sync, syncing } = useData();
  const [subject, setSubject] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState<StatusFilter>('open');

  const subjects = useMemo(() => [...new Set(tasks.map((t) => t.courseName))].sort((a, b) => a.localeCompare(b, 'he')), [tasks]);
  const sources = useMemo(() => [...new Set(tasks.map((t) => t.source))], [tasks]);

  const list = useMemo(() => {
    const filtered = tasks.filter(
      (t) =>
        (!subject || t.courseName === subject) &&
        (!source || t.source === source) &&
        (status === 'all' || (status === 'open' ? !isDone(t) : isDone(t))),
    );
    return status === 'done' ? filtered.sort(byDue).reverse() : filtered.sort(byDue);
  }, [tasks, subject, source, status]);

  return (
    <Screen title="כל המשימות" subtitle={`${list.length} משימות`} refreshing={syncing} onRefresh={sync}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="פתוחות" active={status === 'open'} onPress={() => setStatus('open')} />
        <Chip label="הוגשו" active={status === 'done'} onPress={() => setStatus('done')} />
        <Chip label="הכל" active={status === 'all'} onPress={() => setStatus('all')} />
      </View>

      {sources.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <T dim size={13} style={{ alignSelf: 'center' }}>מקור:</T>
          <Chip label="הכל" active={!source} onPress={() => setSource(null)} />
          {sources.map((s) => (
            <Chip key={s} label={SOURCE_LABEL[s]} active={source === s} onPress={() => setSource(source === s ? null : s)} />
          ))}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="כל המקצועות" active={!subject} onPress={() => setSubject(null)} />
        {subjects.map((s) => (
          <Chip key={s} label={s} color={subjectColor(s)} active={subject === s} onPress={() => setSubject(subject === s ? null : s)} />
        ))}
      </ScrollView>

      {list.length ? (
        list.map((t) => <TaskCard key={t.id} task={t} showSource={sources.length > 1} />)
      ) : (
        <Empty emoji="✨" text="אין משימות בסינון הזה" />
      )}
    </Screen>
  );
}

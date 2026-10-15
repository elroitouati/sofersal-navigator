import { router } from 'expo-router';
import { View } from 'react-native';
import { SOURCE_LABEL, type Task } from '@/models/types';
import { subjectColor } from '@/theme/subjects';
import { URGENCY_LABEL, urgencyColor, urgencyOf, useTheme } from '@/theme/theme';
import { relativeDue } from '@/util/date';
import { Badge, Card, T } from './ui';

export function TaskCard({ task, showSource }: { task: Task; showSource?: boolean }) {
  const t = useTheme();
  const u = urgencyOf(task);
  const uc = urgencyColor(u, t);
  const sc = subjectColor(task.courseName);
  return (
    <Card onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })} style={{ paddingStart: 0, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 5, borderRadius: 3, backgroundColor: sc, marginVertical: -14 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T size={12} weight="700" style={{ color: sc }}>{task.courseName}</T>
            {showSource ? <T dim size={11}>· {SOURCE_LABEL[task.source]}</T> : null}
            <View style={{ flex: 1 }} />
            <Badge label={u === 'done' && task.status === 'graded' ? 'נבדק' : URGENCY_LABEL[u]} color={uc} />
          </View>
          <T size={16} weight="700" numberOfLines={2}>{task.title}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T dim size={13}>⏰ {relativeDue(task.dueAt)}</T>
            {task.grade !== null ? (
              <T size={13} weight="700" style={{ color: t.ok }}>
                ציון: {task.grade}{task.maxGrade && task.maxGrade !== 100 ? `/${task.maxGrade}` : ''}
              </T>
            ) : null}
            {task.teacherComment ? <T dim size={13}>💬</T> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

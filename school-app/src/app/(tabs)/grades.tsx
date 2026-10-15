import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Empty, Screen, T } from '@/components/ui';
import type { Grade } from '@/models/types';
import { useData } from '@/state/DataContext';
import { subjectColor } from '@/theme/subjects';
import { useTheme } from '@/theme/theme';
import { formatDate } from '@/util/date';

const pct = (g: Grade) => (g.score / g.maxScore) * 100;

export default function GradesScreen() {
  const t = useTheme();
  const { grades, sync, syncing } = useData();
  const [open, setOpen] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of grades) map.set(g.courseName, [...(map.get(g.courseName) ?? []), g]);
    return [...map.entries()]
      .map(([course, list]) => ({
        course,
        list: list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
        avg: list.reduce((s, g) => s + pct(g), 0) / list.length,
      }))
      .sort((a, b) => a.course.localeCompare(b.course, 'he'));
  }, [grades]);

  const overall = groups.length ? groups.reduce((s, g) => s + g.avg, 0) / groups.length : null;
  const colorFor = (v: number) => (v >= 85 ? t.ok : v >= 70 ? t.caution : t.danger);

  return (
    <Screen title="ציונים" refreshing={syncing} onRefresh={sync}>
      {overall !== null ? (
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <T dim>ממוצע כללי (ממוצע המקצועות)</T>
          <T size={44} weight="800" style={{ color: colorFor(overall) }}>{overall.toFixed(1)}</T>
        </Card>
      ) : (
        <Empty emoji="📭" text="עוד אין ציונים" />
      )}

      {groups.map(({ course, list, avg }) => {
        const c = subjectColor(course);
        const expanded = open === course;
        return (
          <Card key={course} onPress={() => setOpen(expanded ? null : course)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c + '22', alignItems: 'center', justifyContent: 'center' }}>
                <T size={18} weight="800" style={{ color: c }}>{course.slice(0, 1)}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="700" size={16}>{course}</T>
                <T dim size={12}>{list.length} ציונים · {expanded ? 'הסתר' : 'הצג פירוט'}</T>
              </View>
              <T size={24} weight="800" style={{ color: colorFor(avg) }}>{avg.toFixed(1)}</T>
            </View>
            <View style={{ height: 6, backgroundColor: t.cardAlt, borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, avg)}%`, height: 6, backgroundColor: c, borderRadius: 3 }} />
            </View>
            {expanded ? (
              <View style={{ marginTop: 10, gap: 10 }}>
                {list.map((g) => (
                  <Pressable key={g.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <T weight="600">{g.title}</T>
                      <T dim size={12}>{formatDate(g.date)}{g.comment ? ` · 💬 ${g.comment}` : ''}</T>
                    </View>
                    <T weight="800" size={16}>
                      {g.score}{g.maxScore !== 100 ? `/${g.maxScore}` : ''}
                    </T>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

import { useColorScheme } from 'react-native';
import { dayDiff } from '@/util/date';
import { isDone, type Task } from '@/models/types';

const light = {
  bg: '#F4F5FA',
  card: '#FFFFFF',
  cardAlt: '#EEF0F7',
  text: '#14162B',
  textDim: '#5E6380',
  border: '#E1E4EF',
  primary: '#4F46E5',
  primaryText: '#FFFFFF',
  danger: '#DC2626',
  warn: '#EA580C',
  caution: '#CA8A04',
  ok: '#16A34A',
  muted: '#8A8FA8',
};

const dark: typeof light = {
  bg: '#0E0F1A',
  card: '#191B2B',
  cardAlt: '#22253A',
  text: '#F1F2FA',
  textDim: '#A3A8C3',
  border: '#2B2F47',
  primary: '#8B85FF',
  primaryText: '#0E0F1A',
  danger: '#F87171',
  warn: '#FB923C',
  caution: '#FACC15',
  ok: '#4ADE80',
  muted: '#6E7391',
};

export type Theme = typeof light & { dark: boolean };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? { ...dark, dark: true } : { ...light, dark: false };
}

export type Urgency = 'overdue' | 'today' | 'soon' | 'later' | 'none' | 'done';

export function urgencyOf(task: Task, now = new Date()): Urgency {
  if (isDone(task)) return 'done';
  if (!task.dueAt) return 'none';
  if (new Date(task.dueAt).getTime() < now.getTime()) return 'overdue';
  const diff = dayDiff(task.dueAt, now);
  if (diff <= 0) return 'today';
  if (diff <= 3) return 'soon';
  return 'later';
}

export function urgencyColor(u: Urgency, t: Theme): string {
  switch (u) {
    case 'overdue': return t.danger;
    case 'today': return t.warn;
    case 'soon': return t.caution;
    case 'later': return t.ok;
    case 'done': return t.muted;
    default: return t.textDim;
  }
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'באיחור',
  today: 'היום',
  soon: 'בקרוב',
  later: 'יש זמן',
  none: 'ללא דדליין',
  done: 'הוגש',
};

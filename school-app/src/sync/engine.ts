// מנוע הסנכרון: מושך מכל מקור מחובר, משווה למצב הקודם, שומר, ושולח התראות.
// רץ גם מהממשק (משיכה למטה) וגם ברקע (expo-background-task).
import { clearSource, kvGet, kvGetJson, kvSet, kvSetJson, loadAll, loadSource, replaceSource } from '@/db/db';
import type { Snapshot, Source } from '@/models/types';
import { notifyEvents, rescheduleDeadlineReminders } from '@/notify/notify';
import { fetchAmit, isAmitConfigured } from '@/sources/amit/amitSource';
import { fetchClassroom, isClassroomConnected } from '@/sources/classroom/classroomSource';
import { mockSnapshot } from '@/sources/mock/mockSource';
import { getPrefs } from '@/state/prefs';
import { diffSnapshots } from './diff';

export type SourceStatus = Partial<Record<Source, { ok: boolean; at: string; error?: string }>>;

export interface SyncResult {
  events: number;
  errors: string[];
}

let running: Promise<SyncResult> | null = null;

/** אם כבר רץ סנכרון – מחזיר את אותו אחד (למנוע כפילויות בין רקע לממשק) */
export function runSync(): Promise<SyncResult> {
  if (!running) running = doSync().finally(() => (running = null));
  return running;
}

async function doSync(): Promise<SyncResult> {
  const prefs = await getPrefs();
  const status = await kvGetJson<SourceStatus>('sync.status', {});
  const errors: string[] = [];
  let eventCount = 0;

  const sources: [Source, (prev: Snapshot) => Promise<Snapshot>][] = [];
  if (await isClassroomConnected()) sources.push(['classroom', () => fetchClassroom()]);
  if (await isAmitConfigured()) sources.push(['amit', fetchAmit]);
  if (prefs.demoMode) sources.push(['mock', async () => mockSnapshot()]);
  else await clearSource('mock');

  for (const [source, fetcher] of sources) {
    const now = new Date().toISOString();
    try {
      const prev = await loadSource(source);
      const next = await fetcher(prev);
      const firstSync = !(await kvGet(`sync.seen.${source}`));
      await replaceSource(source, next);
      if (!firstSync && source !== 'mock') {
        const events = diffSnapshots(prev, next);
        eventCount += events.length;
        await notifyEvents(events, prefs);
      }
      await kvSet(`sync.seen.${source}`, '1');
      status[source] = { ok: true, at: now };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      status[source] = { ok: false, at: now, error: msg };
    }
  }

  const all = await loadAll();
  try {
    await rescheduleDeadlineReminders(all.tasks, prefs);
  } catch {}
  await kvSetJson('sync.status', status);
  await kvSet('sync.last', new Date().toISOString());
  return { events: eventCount, errors };
}

export const getLastSync = () => kvGet('sync.last');
export const getSourceStatus = () => kvGetJson<SourceStatus>('sync.status', {});

/** אחרי ניתוק חשבון: מחיקת הנתונים שלו ואיפוס "כבר ראיתי" כדי שבחיבור מחדש לא תהיה הצפת התראות */
export async function forgetSource(source: Source) {
  await clearSource(source);
  await kvSet(`sync.seen.${source}`, null);
}

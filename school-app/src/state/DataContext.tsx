import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadAll } from '@/db/db';
import type { Snapshot } from '@/models/types';
import { getLastSync, runSync, type SyncResult } from '@/sync/engine';

interface DataState extends Snapshot {
  loading: boolean;
  syncing: boolean;
  lastSync: string | null;
  lastErrors: string[];
  /** טוען מחדש מה-DB בלי למשוך מהאתרים */
  reload: () => Promise<void>;
  /** משיכה מלאה מכל המקורות */
  sync: () => Promise<SyncResult>;
}

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>({ tasks: [], grades: [], notes: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastErrors, setLastErrors] = useState<string[]>([]);

  const reload = useCallback(async () => {
    const [data, last] = await Promise.all([loadAll(), getLastSync()]);
    setSnap(data);
    setLastSync(last);
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await runSync();
      setLastErrors(res.errors);
      await reload();
      return res;
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
      await sync();
    })();
  }, [reload, sync]);

  const value = useMemo(
    () => ({ ...snap, loading, syncing, lastSync, lastErrors, reload, sync }),
    [snap, loading, syncing, lastSync, lastErrors, reload, sync],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}

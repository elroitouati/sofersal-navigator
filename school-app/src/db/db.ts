// שכבת SQLite. כל הנתונים נשמרים רק על הטלפון.
import * as SQLite from 'expo-sqlite';
import type { Grade, Note, Snapshot, Source, Task } from '@/models/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('school.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY NOT NULL, source TEXT NOT NULL, courseName TEXT NOT NULL,
          title TEXT NOT NULL, description TEXT, dueAt TEXT, status TEXT NOT NULL,
          grade REAL, maxGrade REAL, teacherComment TEXT, url TEXT
        );
        CREATE TABLE IF NOT EXISTS grades (
          id TEXT PRIMARY KEY NOT NULL, source TEXT NOT NULL, courseName TEXT NOT NULL,
          title TEXT NOT NULL, score REAL NOT NULL, maxScore REAL NOT NULL, date TEXT, comment TEXT
        );
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY NOT NULL, source TEXT NOT NULL, courseName TEXT NOT NULL,
          text TEXT NOT NULL, date TEXT, url TEXT
        );
        CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function loadAll(): Promise<Snapshot> {
  const db = await getDb();
  const [tasks, grades, notes] = await Promise.all([
    db.getAllAsync<Task>('SELECT * FROM tasks'),
    db.getAllAsync<Grade>('SELECT * FROM grades'),
    db.getAllAsync<Note>('SELECT * FROM notes ORDER BY date DESC'),
  ]);
  return { tasks, grades, notes };
}

export async function loadSource(source: Source): Promise<Snapshot> {
  const db = await getDb();
  const [tasks, grades, notes] = await Promise.all([
    db.getAllAsync<Task>('SELECT * FROM tasks WHERE source = ?', source),
    db.getAllAsync<Grade>('SELECT * FROM grades WHERE source = ?', source),
    db.getAllAsync<Note>('SELECT * FROM notes WHERE source = ?', source),
  ]);
  return { tasks, grades, notes };
}

export async function getTask(id: string): Promise<Task | null> {
  const db = await getDb();
  return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', id);
}

/** מחליף את כל הנתונים של מקור אחד בתמונת מצב חדשה (בטרנזקציה אחת) */
export async function replaceSource(source: Source, snap: Snapshot): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM tasks WHERE source = ?', source);
    await db.runAsync('DELETE FROM grades WHERE source = ?', source);
    await db.runAsync('DELETE FROM notes WHERE source = ?', source);
    for (const t of snap.tasks) {
      await db.runAsync(
        `INSERT OR REPLACE INTO tasks (id, source, courseName, title, description, dueAt, status, grade, maxGrade, teacherComment, url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id, source, t.courseName, t.title, t.description, t.dueAt, t.status, t.grade, t.maxGrade, t.teacherComment, t.url,
      );
    }
    for (const g of snap.grades) {
      await db.runAsync(
        `INSERT OR REPLACE INTO grades (id, source, courseName, title, score, maxScore, date, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        g.id, source, g.courseName, g.title, g.score, g.maxScore, g.date, g.comment,
      );
    }
    for (const n of snap.notes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO notes (id, source, courseName, text, date, url) VALUES (?, ?, ?, ?, ?, ?)`,
        n.id, source, n.courseName, n.text, n.date, n.url,
      );
    }
  });
}

export async function clearSource(source: Source): Promise<void> {
  await replaceSource(source, { tasks: [], grades: [], notes: [] });
}

// ---------- הגדרות (key/value) ----------

export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM kv WHERE key = ?', key);
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  if (value === null) await db.runAsync('DELETE FROM kv WHERE key = ?', key);
  else await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
}

export async function kvGetJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await kvGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const kvSetJson = (key: string, value: unknown) => kvSet(key, JSON.stringify(value));

export async function wipeDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM tasks; DELETE FROM grades; DELETE FROM notes; DELETE FROM kv;');
}

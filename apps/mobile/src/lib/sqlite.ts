import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let db: SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (!db) {
    db = await openDatabaseAsync('bluefood.db');
  }
  return db;
}

export async function initDb(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      batch_code TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      synced_at TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS cached_batches (
      batch_code TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    UPDATE offline_queue
    SET status = 'pending', error_message = NULL
    WHERE status = 'failed'
      AND (
        error_message = 'Chưa đăng nhập'
        OR error_message LIKE '%đăng nhập%'
        OR error_message LIKE '%Ä‘Äƒng nháº­p%'
        OR error_message LIKE '%UNAUTHORIZED%'
        OR error_message LIKE '%Unauthorized%'
      );
  `);
}

import type { BatchSummaryData } from './api';
import { getDb } from './sqlite';

export interface CachedBatchSummary {
  data: BatchSummaryData;
  cachedAt: string;
}

export async function saveCachedBatchSummary(data: BatchSummaryData): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_batches (batch_code, payload_json, cached_at)
     VALUES (?, ?, ?)`,
    [data.batchCode, JSON.stringify(data), new Date().toISOString()]
  );
}

export async function getCachedBatchSummary(batchCode: string): Promise<CachedBatchSummary | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ payload_json: string; cached_at: string }>(
    `SELECT payload_json, cached_at FROM cached_batches WHERE batch_code = ?`,
    [batchCode]
  );

  if (!row) return null;

  try {
    return {
      data: JSON.parse(row.payload_json) as BatchSummaryData,
      cachedAt: row.cached_at,
    };
  } catch {
    return null;
  }
}

import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite';
import { hasAuthToken, syncMutations } from './api';
import { isNetworkRequestError, isOnline } from './network';

export interface QueueItem {
  id: string;
  batchCode: string;
  eventType: string;
  payloadJson: string;
  status: 'pending' | 'synced' | 'failed';
  createdAt: string;
  syncedAt?: string;
  errorMessage?: string;
}

export async function enqueueMutation(payload: {
  batchCode: string;
  eventType: string;
  occurredAt: string;
  locationName?: string;
  temperatureC?: number;
  note?: string;
}): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  const clientMutationId = id;
  const fullPayload = { ...payload, clientMutationId };

  await db.runAsync(
    `INSERT INTO offline_queue (id, batch_code, event_type, payload_json, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [id, payload.batchCode, payload.eventType, JSON.stringify(fullPayload), new Date().toISOString()]
  );

  return id;
}

export async function getPendingMutations(): Promise<QueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM offline_queue WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return rows.map(rowToItem);
}

export async function getAllQueueItems(): Promise<QueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM offline_queue ORDER BY created_at DESC`);
  return rows.map(rowToItem);
}

export async function markMutationSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE offline_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export async function markMutationFailed(id: string, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE offline_queue SET status = 'failed', error_message = ? WHERE id = ?`,
    [error, id]
  );
}

export async function syncPendingMutations(): Promise<{ synced: number; failed: number }> {
  const online = await isOnline();
  if (!online) return { synced: 0, failed: 0 };
  if (!hasAuthToken()) {
    throw new Error('Vui lòng đăng nhập để đồng bộ sự kiện.');
  }

  const pending = await getPendingMutations();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  try {
    const mutations = pending.map((item) => JSON.parse(item.payloadJson));
    const result = await syncMutations(mutations);

    for (const r of result.results ?? []) {
      const item = pending.find((p) => {
        const payload = JSON.parse(p.payloadJson);
        return payload.clientMutationId === r.clientMutationId;
      });
      if (!item) continue;

      if (r.status === 'synced' || r.status === 'duplicate') {
        await markMutationSynced(item.id);
        synced++;
      } else {
        await markMutationFailed(item.id, r.errorMessage ?? r.status);
        failed++;
      }
    }
  } catch (err: any) {
    if (isNetworkRequestError(err) || err?.status >= 500) {
      return { synced, failed: 0 };
    }

    if (err?.status === 401 || err?.code === 'UNAUTHORIZED') {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để đồng bộ sự kiện.');
    }

    for (const item of pending) {
      await markMutationFailed(item.id, err?.message ?? 'Network error');
      failed++;
    }
  }

  return { synced, failed };
}

function rowToItem(row: any): QueueItem {
  return {
    id: row.id,
    batchCode: row.batch_code,
    eventType: row.event_type,
    payloadJson: row.payload_json,
    status: row.status,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    errorMessage: row.error_message,
  };
}

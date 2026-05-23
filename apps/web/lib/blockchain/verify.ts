import { createClient } from '@supabase/supabase-js';
import { buildHash } from './hash-builder';
import { getOnChainRecord } from './tx-signer';

export type VerifyStatus = 'verified' | 'tampered' | 'not_anchored' | 'pending';

export interface EventVerifyResult {
  batchEventId: string;
  eventType: string;
  computedHash: string;
  onChainHash: string | null;
  status: VerifyStatus;
  blockNumber: number | null;
  txHash: string | null;
}

export interface BatchVerifyResult {
  batchId: string;
  lotId: string;
  events: EventVerifyResult[];
  allVerified: boolean;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function verifyBatch(batchId: string): Promise<BatchVerifyResult> {
  const supabase = getServiceClient();

  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('id, batch_code')
    .eq('id', batchId)
    .single();

  if (batchErr || !batch) throw new Error(`Batch not found: ${batchId}`);

  const { data: events, error: eventsErr } = await supabase
    .from('batch_events')
    .select('id, event_type, occurred_at, note, batch_id, created_at')
    .eq('batch_id', batchId)
    .order('occurred_at', { ascending: true });

  if (eventsErr) throw new Error(eventsErr.message);

  const { data: blockchainRows } = await supabase
    .from('batch_blockchain')
    .select('batch_event_id, data_hash, status, tx_hash, block_number')
    .eq('batch_id', batchId);

  const bcMap = new Map(
    (blockchainRows ?? []).map((r) => [r.batch_event_id, r])
  );

  const results: EventVerifyResult[] = await Promise.all(
    (events ?? []).map(async (ev) => {
      const payload: Record<string, unknown> = {
        batchId: ev.batch_id,
        eventType: ev.event_type,
        occurredAt: ev.occurred_at,
        notes: (ev as any).note ?? null,
      };
      const computedHash = buildHash(payload);
      const bcRow = bcMap.get(ev.id);

      if (!bcRow) {
        return {
          batchEventId: ev.id,
          eventType: ev.event_type,
          computedHash,
          onChainHash: null,
          status: 'not_anchored' as VerifyStatus,
          blockNumber: null,
          txHash: null,
        };
      }

      if (bcRow.status === 'pending') {
        return {
          batchEventId: ev.id,
          eventType: ev.event_type,
          computedHash,
          onChainHash: null,
          status: 'pending' as VerifyStatus,
          blockNumber: null,
          txHash: bcRow.tx_hash ?? null,
        };
      }

      const onChainRecord = await getOnChainRecord(computedHash).catch(() => null);

      if (!onChainRecord) {
        return {
          batchEventId: ev.id,
          eventType: ev.event_type,
          computedHash,
          onChainHash: bcRow.data_hash ?? null,
          status: 'tampered' as VerifyStatus,
          blockNumber: bcRow.block_number ?? null,
          txHash: bcRow.tx_hash ?? null,
        };
      }

      const matches = onChainRecord.dataHash.toLowerCase() === computedHash.toLowerCase();
      return {
        batchEventId: ev.id,
        eventType: ev.event_type,
        computedHash,
        onChainHash: onChainRecord.dataHash,
        status: (matches ? 'verified' : 'tampered') as VerifyStatus,
        blockNumber: bcRow.block_number ?? null,
        txHash: bcRow.tx_hash ?? null,
      };
    })
  );

  return {
    batchId,
    lotId: batch.batch_code,
    events: results,
    allVerified: results.length > 0 && results.every((r) => r.status === 'verified'),
  };
}

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { ethers, keccak256, toUtf8Bytes, ZeroHash } from 'ethers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ABI = [
  'function anchor(bytes32 dataHash, string calldata lotId, string calldata eventType, bytes32 prevHash) external',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(sortKeys);
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortKeys(v)])
  );
}

function buildHash(payload: Record<string, unknown>): string {
  return keccak256(toUtf8Bytes(JSON.stringify(sortKeys(payload))));
}

interface BatchEvent {
  id: string;
  event_type: string;
  occurred_at: string;
  location_name: string | null;
  temperature_c: number | null;
  note: string | null;
}

// Keccak256 của tất cả event hashes ghép lại theo thứ tự thời gian
function buildBatchSummaryHash(events: BatchEvent[]): string {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );
  const hashes = sorted.map(e =>
    buildHash({ id: e.id, event_type: e.event_type, occurred_at: e.occurred_at })
  );
  return keccak256(toUtf8Bytes(hashes.join(',')));
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Lấy tất cả batch_id chưa anchor
  const { data: unanchoredRows } = await supabase
    .from('batch_events')
    .select('batch_id')
    .not('id', 'in',
      `(SELECT batch_event_id FROM batch_blockchain WHERE status = 'confirmed')`
    );

  const batchIds = Array.from(new Set((unanchoredRows ?? []).map(r => r.batch_id))) as string[];
  console.log(`Tổng: ${batchIds.length} lô cần anchor`);

  // 2. Setup contract
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL!);
  const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_SUBMITTER_PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS!, ABI, wallet);

  let nonce = await provider.getTransactionCount(wallet.address, 'latest');
  let success = 0, failed = 0;

  for (let i = 0; i < batchIds.length; i++) {
    const batchId = batchIds[i];

    // 3. Lấy batch_code và events của lô này
    const [{ data: batch }, { data: events }] = await Promise.all([
      supabase.from('batches').select('batch_code').eq('id', batchId).single(),
      supabase.from('batch_events').select('id,event_type,occurred_at,location_name,temperature_c,note').eq('batch_id', batchId),
    ]);

    if (!batch || !events?.length) { failed++; continue; }

    const summaryHash = buildBatchSummaryHash(events);
    const lotId = batch.batch_code;

    try {
      // 4. Gửi tx lên Amoy
      const tx = await contract.anchor(summaryHash, lotId, 'batch_summary', ZeroHash, { nonce });
      nonce++;
      console.log(`[${i + 1}/${batchIds.length}] ${lotId} → tx ${tx.hash}`);

      const receipt = await tx.wait(1);

      // 5. Ghi batch_blockchain cho tất cả events trong lô
      const rows = events.map(e => ({
        id: crypto.randomUUID(),
        batch_event_id: e.id,
        batch_id: batchId,
        data_hash: summaryHash,
        status: 'confirmed',
        tx_hash: receipt.hash,
        block_number: Number(receipt.blockNumber),
        anchored_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase.from('batch_blockchain').upsert(rows, { onConflict: 'batch_event_id' });
      if (insertErr) console.error(`  DB error: ${insertErr.message}`);

      success++;
    } catch (err: unknown) {
      console.error(`  FAILED ${lotId}:`, err instanceof Error ? err.message : err);
      failed++;
      nonce = await provider.getTransactionCount(wallet.address, 'latest');
    }

    // Rate limit: tránh spam RPC
    await sleep(1500);
  }

  console.log(`\n✓ Done: ${success} thành công, ${failed} thất bại`);
}

main().catch(console.error);

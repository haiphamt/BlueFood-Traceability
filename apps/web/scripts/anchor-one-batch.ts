import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { ethers, keccak256, toUtf8Bytes, ZeroHash } from 'ethers';

const ABI = [
  'function anchor(bytes32 dataHash, string calldata lotId, string calldata eventType, bytes32 prevHash) external',
];

interface BatchEvent {
  id: string;
  batch_id: string;
  event_type: string;
  occurred_at: string;
  location_name: string | null;
  temperature_c: number | null;
  note: string | null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortKeys(v)])
  );
}

function buildHash(payload: Record<string, unknown>): string {
  return keccak256(toUtf8Bytes(JSON.stringify(sortKeys(payload))));
}

function buildBatchSummaryHash(events: BatchEvent[]): string {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );

  return buildHash({
    kind: 'batch_summary',
    events: sorted.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      occurredAt: event.occurred_at,
      locationName: event.location_name,
      temperatureC: event.temperature_c,
      note: event.note,
    })),
  });
}

async function main() {
  const lotId = process.argv[2]?.trim();
  const dryRun = process.argv.includes('--dry-run');

  if (!lotId) {
    throw new Error('Usage: pnpm anchor-one LOT-2605-0103 [--dry-run]');
  }

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('id, batch_code')
    .eq('batch_code', lotId)
    .single();

  if (batchErr || !batch) throw new Error(`Batch not found: ${lotId}`);

  const { data: events, error: eventsErr } = await supabase
    .from('batch_events')
    .select('id,batch_id,event_type,occurred_at,location_name,temperature_c,note')
    .eq('batch_id', batch.id)
    .order('occurred_at', { ascending: true });

  if (eventsErr) throw new Error(eventsErr.message);
  if (!events?.length) throw new Error(`Batch ${lotId} has no events to anchor`);

  const { data: existing, error: existingErr } = await supabase
    .from('batch_blockchain')
    .select('batch_event_id,status,tx_hash')
    .eq('batch_id', batch.id)
    .eq('status', 'confirmed');

  if (existingErr) throw new Error(existingErr.message);

  const confirmedIds = new Set((existing ?? []).map((row) => row.batch_event_id));
  const unanchoredEvents = events.filter((event) => !confirmedIds.has(event.id));

  if (unanchoredEvents.length === 0) {
    console.log(`${lotId} already has confirmed blockchain proofs for all ${events.length} events.`);
    return;
  }

  const dataHash = buildBatchSummaryHash(events as BatchEvent[]);
  console.log(`Batch: ${lotId}`);
  console.log(`Events: ${events.length} total, ${unanchoredEvents.length} need proof rows`);
  console.log(`Summary hash: ${dataHash}`);

  if (dryRun) {
    console.log('Dry run only. No transaction was sent and no database rows were written.');
    return;
  }

  const provider = new ethers.JsonRpcProvider(requireEnv('POLYGON_RPC_URL'));
  const wallet = new ethers.Wallet(requireEnv('BLOCKCHAIN_SUBMITTER_PRIVATE_KEY'), provider);
  const contract = new ethers.Contract(requireEnv('CONTRACT_ADDRESS'), ABI, wallet);

  console.log(`Sending 1 blockchain transaction from ${wallet.address}...`);
  const tx = await contract.anchor(dataHash, lotId, 'batch_summary', ZeroHash);
  console.log(`Transaction sent: ${tx.hash}`);

  const receipt = await tx.wait(1);
  if (!receipt) throw new Error('Transaction receipt is null');

  const rows = unanchoredEvents.map((event) => ({
    id: crypto.randomUUID(),
    batch_event_id: event.id,
    batch_id: batch.id,
    data_hash: dataHash,
    status: 'confirmed',
    tx_hash: receipt.hash,
    block_number: Number(receipt.blockNumber),
    anchored_at: new Date().toISOString(),
    retry_count: 0,
  }));

  const { error: upsertErr } = await supabase
    .from('batch_blockchain')
    .upsert(rows, { onConflict: 'batch_event_id' });

  if (upsertErr) throw new Error(upsertErr.message);

  const explorerBase = process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL ?? 'https://amoy.polygonscan.com';
  console.log(`Confirmed block: ${receipt.blockNumber}`);
  console.log(`Proof rows written: ${rows.length}`);
  console.log(`Explorer: ${explorerBase.replace(/\/$/, '')}/tx/${receipt.hash}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

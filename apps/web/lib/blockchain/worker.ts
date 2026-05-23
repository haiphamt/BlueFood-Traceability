import { Worker, type Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { buildHash } from './hash-builder';
import { anchorOnChain } from './tx-signer';
import { getRedisConnection, type AnchorJobData } from './queue';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function notifySlack(message: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  }).catch(() => {});
}

async function processAnchorJob(job: Job<AnchorJobData>): Promise<void> {
  const { batchEventId, batchId, lotId, eventType, payload, prevHash } = job.data;
  const supabase = getServiceClient();

  const dataHash = buildHash(payload);

  await supabase
    .from('batch_blockchain')
    .update({ status: 'pending', retry_count: job.attemptsMade, updated_at: new Date().toISOString() })
    .eq('batch_event_id', batchEventId);

  const receipt = await anchorOnChain(dataHash, lotId, eventType, prevHash);

  await supabase
    .from('batch_blockchain')
    .update({
      status: 'confirmed',
      tx_hash: receipt.hash,
      block_number: Number(receipt.blockNumber),
      data_hash: dataHash,
      anchored_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('batch_event_id', batchEventId);
}

export function startWorker(): Worker<AnchorJobData> {
  const worker = new Worker<AnchorJobData>(
    'blockchain-anchor',
    processAnchorJob,
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 5);
    if (!isLastAttempt) return;

    const supabase = getServiceClient();
    await supabase
      .from('batch_blockchain')
      .update({
        status: 'failed',
        error_message: err.message,
        updated_at: new Date().toISOString(),
      })
      .eq('batch_event_id', job.data.batchEventId);

    await notifySlack(
      `[BlueFood] Blockchain anchor FAILED after 5 attempts\n` +
      `Batch: ${job.data.batchId} | Event: ${job.data.eventType}\n` +
      `Error: ${err.message}`
    );
  });

  worker.on('error', (err) => {
    console.error('[blockchain-worker] error:', err);
  });

  return worker;
}

import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { buildHash } from '@/lib/blockchain/hash-builder';
import { getAnchorQueue } from '@/lib/blockchain/queue';
import { z } from 'zod';

const anchorSchema = z.object({
  batchEventId: z.string().uuid(),
  batchId: z.string().uuid(),
  lotId: z.string().min(1),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()),
  prevHash: z.string().optional(),
});

// Called by the Supabase Edge Function webhook — secured by ANCHOR_WEBHOOK_SECRET
export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.ANCHOR_WEBHOOK_SECRET) {
    return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = anchorSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERRORS.VALIDATION_ERROR.code, parsed.error.errors[0]?.message ?? 'Invalid payload', 422);
  }

  const { batchEventId, batchId, lotId, eventType, payload, prevHash } = parsed.data;
  const dataHash = buildHash(payload);

  const supabase = createSupabaseServiceClient();

  // Idempotency: skip if already queued/confirmed
  const { data: existing } = await supabase
    .from('batch_blockchain')
    .select('id, status')
    .eq('batch_event_id', batchEventId)
    .maybeSingle();

  if (existing && existing.status !== 'failed') {
    return apiOk({ jobId: existing.id, status: existing.status, skipped: true });
  }

  const jobId = existing?.id ?? crypto.randomUUID();

  if (!existing) {
    const { error } = await supabase.from('batch_blockchain').insert({
      id: jobId,
      batch_event_id: batchEventId,
      batch_id: batchId,
      data_hash: dataHash,
      status: 'pending',
    });
    if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  } else {
    await supabase
      .from('batch_blockchain')
      .update({ status: 'pending', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }

  const queue = getAnchorQueue();
  await queue.add(
    'anchor',
    { batchEventId, batchId, lotId, eventType, payload, prevHash },
    { jobId }
  );

  return apiOk({ jobId, status: 'pending' }, 202);
}

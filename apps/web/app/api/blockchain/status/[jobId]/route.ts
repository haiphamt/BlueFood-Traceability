import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data, error } = await supabase
    .from('batch_blockchain')
    .select('id, batch_event_id, batch_id, data_hash, status, tx_hash, block_number, anchored_at, error_message, retry_count, created_at, updated_at')
    .eq('id', params.jobId)
    .maybeSingle();

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  if (!data) return apiError(ERRORS.NOT_FOUND.code, ERRORS.NOT_FOUND.message, 404);

  const polygonscanBase = process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL ?? 'https://polygonscan.com';
  const explorerUrl = data.tx_hash ? `${polygonscanBase}/tx/${data.tx_hash}` : null;

  return apiOk({
    jobId: data.id,
    batchEventId: data.batch_event_id,
    batchId: data.batch_id,
    dataHash: data.data_hash,
    status: data.status,
    txHash: data.tx_hash,
    blockNumber: data.block_number,
    anchoredAt: data.anchored_at,
    errorMessage: data.error_message,
    retryCount: data.retry_count,
    explorerUrl,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { verifyBatch } from '@/lib/blockchain/verify';

export async function GET(
  _request: Request,
  { params }: { params: { batchId: string } }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  try {
    const result = await verifyBatch(params.batchId);
    return apiOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    if (message.includes('not found')) {
      return apiError(ERRORS.NOT_FOUND.code, message, 404);
    }
    return apiError(ERRORS.INTERNAL.code, message, 500);
  }
}

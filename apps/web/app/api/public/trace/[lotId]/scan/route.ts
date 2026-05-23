import { createClient } from '@supabase/supabase-js';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { qrScanLogSchema } from '@bluefood/shared';

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: { lotId: string } }
) {
  const { lotId } = params;
  const supabase = createPublicClient();

  const body = await request.json().catch(() => ({}));
  const parsed = qrScanLogSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Dữ liệu không hợp lệ', 422);
  }

  const { data: batch } = await supabase
    .from('batches')
    .select('id')
    .eq('batch_code', lotId)
    .single();

  await supabase.from('qr_scan_logs').insert({
    batch_id: batch?.id ?? null,
    batch_code: lotId,
    source: parsed.data.source,
    user_agent: parsed.data.userAgent,
  });

  return apiOk({ ok: true });
}

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const [batchesRes, scanRes] = await Promise.all([
    supabase.from('batches').select('status'),
    supabase
      .from('qr_scan_logs')
      .select('id', { count: 'exact', head: true })
      .gte('scanned_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const batches = batchesRes.data ?? [];
  const activeBatches = batches.filter((b) => !['sold', 'recalled', 'cancelled'].includes(b.status)).length;
  const inTransit = batches.filter((b) => b.status === 'in_transit').length;
  const warnings = batches.filter((b) => b.status === 'recalled').length;

  return apiOk({
    activeBatches,
    inTransit,
    qrScansThisMonth: scanRes.count ?? 0,
    warnings,
  });
}

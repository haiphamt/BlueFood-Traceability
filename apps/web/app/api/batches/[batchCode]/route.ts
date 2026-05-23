import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchCode: string }> }
) {
  const { batchCode } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const service = createSupabaseServiceClient();

  const { data: batch, error } = await service
    .from('batches')
    .select('*, products(*), suppliers(*), certificates(*), shipments(*), batch_events(*)')
    .eq('batch_code', batchCode)
    .single();

  if (error || !batch) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy lô hàng', 404);

  // Fetch audit logs separately so we can order them
  const { data: auditLogs } = await service
    .from('audit_logs')
    .select('*')
    .eq('entity_id', batch.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const b = batch as any;
  const events = (b.batch_events ?? []).sort(
    (a: any, z: any) => new Date(a.occurred_at).getTime() - new Date(z.occurred_at).getTime()
  );

  return apiOk({
    batchCode: b.batch_code,
    product: b.products,
    supplier: b.suppliers,
    batch: {
      id: b.id,
      quantity: b.quantity,
      unit: b.unit,
      status: b.status,
      harvestDate: b.harvest_date,
      expirationDate: b.expiration_date,
      originLocation: b.origin_location,
      qrUrl: b.qr_url,
      notes: b.notes,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    },
    certificates: b.certificates ?? [],
    shipments: b.shipments ?? [],
    events,
    auditLogs: auditLogs ?? [],
  });
}

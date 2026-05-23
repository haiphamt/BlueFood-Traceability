import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { writeBatchAuditLog } from '@/lib/audit';
import { canEditPortal, requirePortalApiContext } from '@/lib/portal';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;
  if (!canEditPortal(context.portalRole)) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json();
  const note = String(body.note ?? '').trim();
  if (!note || note.length > 500) return apiError(ERRORS.VALIDATION_ERROR.code, 'Ghi chú tối đa 500 ký tự', 422);

  const { data: batch } = await context.supabase
    .from('batches')
    .select('id, batch_code, supplier_id')
    .eq('id', params.id)
    .in('supplier_id', context.supplierIds)
    .single();
  if (!batch) return apiError(ERRORS.NOT_FOUND.code, ERRORS.NOT_FOUND.message, 404);

  const { data: event, error } = await context.supabase.from('batch_events').insert({
    batch_id: params.id,
    event_type: 'supplier_note',
    occurred_at: new Date().toISOString(),
    note,
    created_by: context.user.id,
  }).select('id').single();
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  const service = createSupabaseServiceClient();
  const auditError = await writeBatchAuditLog(service, {
    batchId: batch.id,
    actorId: context.user.id,
    action: 'insert',
    entityType: 'batch_events',
    summary: `Nhà cung cấp thêm ghi chú: ${note}`,
    newData: {
      id: event?.id,
      batch_id: batch.id,
      event_type: 'supplier_note',
      note,
    },
  });
  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError, 500);

  revalidatePath(`/batches/${batch.batch_code}`);
  revalidatePath(`/trace/${batch.batch_code}`);
  revalidatePath(`/portal/batches/${batch.id}`);
  return apiOk({ ok: true, eventId: event?.id }, 201);
}

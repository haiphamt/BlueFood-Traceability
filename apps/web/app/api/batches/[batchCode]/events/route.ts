import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { BATCH_STATUS_LABELS, EVENT_TYPE_LABELS, createBatchEventSchema } from '@bluefood/shared';
import type { BatchEventType, BatchStatus } from '@bluefood/shared';
import { revalidatePath } from 'next/cache';

const STATUS_ORDER: Record<BatchStatus, number> = {
  draft: 0,
  created: 1,
  harvested: 2,
  packed: 3,
  quality_checked: 4,
  in_transit: 5,
  received_at_store: 6,
  sold: 7,
  recalled: 8,
  cancelled: 9,
};

const EVENT_STATUS_UPDATES: Partial<Record<BatchEventType, BatchStatus>> = {
  created: 'created',
  harvested: 'harvested',
  packed: 'packed',
  quality_checked: 'quality_checked',
  pickup: 'in_transit',
  in_transit: 'in_transit',
  delivered: 'received_at_store',
  received_at_store: 'received_at_store',
  sold: 'sold',
  recalled: 'recalled',
};

function revalidateBatchViews(batchCode: string) {
  revalidatePath('/batches');
  revalidatePath(`/batches/${batchCode}`);
  revalidatePath(`/trace/${batchCode}`);
  revalidatePath('/dashboard');
  revalidatePath('/reports');
}

function formatEventAuditSummary(eventType: string, note?: string | null) {
  const label = EVENT_TYPE_LABELS[eventType as BatchEventType] ?? eventType;
  const trimmedNote = note?.trim();
  return trimmedNote ? `${label}: ${trimmedNote}` : `${label} được ghi nhận`;
}

function shouldUpdateBatchStatus(currentStatus: string | null | undefined, nextStatus?: BatchStatus) {
  if (!nextStatus || currentStatus === nextStatus) return false;
  if (currentStatus === 'cancelled') return false;
  if (nextStatus === 'recalled') return currentStatus !== 'recalled';
  if (currentStatus === 'recalled') return false;

  const currentOrder = STATUS_ORDER[currentStatus as BatchStatus] ?? -1;
  return STATUS_ORDER[nextStatus] >= currentOrder;
}

function formatStatusAuditSummary(previousStatus: string | null | undefined, nextStatus: BatchStatus) {
  const previousLabel = previousStatus
    ? BATCH_STATUS_LABELS[previousStatus as BatchStatus] ?? previousStatus
    : 'Chưa có trạng thái';
  const nextLabel = BATCH_STATUS_LABELS[nextStatus] ?? nextStatus;
  return `Cập nhật trạng thái lô: ${previousLabel} -> ${nextLabel}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchCode: string }> }
) {
  const { batchCode } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'supplier', 'transporter'].includes(profile.role)) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const body = await request.json();
  const parsed = createBatchEventSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERRORS.VALIDATION_ERROR.code, parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ', 422);
  }

  const input = parsed.data;

  // Find batch
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, status')
    .eq('batch_code', batchCode)
    .single();

  if (batchError || !batch) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy lô hàng', 404);

  // Idempotency check
  if (input.clientMutationId) {
    const { data: existing } = await supabase
      .from('batch_events')
      .select('id')
      .eq('client_mutation_id', input.clientMutationId)
      .single();

    if (existing) {
      return apiOk({ ok: true, eventId: existing.id, batchStatus: batch.status, duplicate: true });
    }
  }

  const { data: event, error: eventError } = await supabase
    .from('batch_events')
    .insert({
      batch_id: batch.id,
      event_type: input.eventType,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      location_name: input.locationName,
      temperature_c: input.temperatureC,
      note: input.note,
      client_mutation_id: input.clientMutationId,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (eventError) return apiError(ERRORS.INTERNAL.code, eventError.message, 500);

  const auditClient = createSupabaseServiceClient();
  const { error: auditError } = await auditClient.from('audit_logs').insert({
    entity_type: 'batch_events',
    entity_id: batch.id,
    actor_id: user.id,
    action: 'insert',
    summary: formatEventAuditSummary(input.eventType, input.note),
  });

  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError.message, 500);

  const nextStatus = EVENT_STATUS_UPDATES[input.eventType as BatchEventType];
  if (shouldUpdateBatchStatus(batch.status, nextStatus)) {
    const { error: statusError } = await auditClient
      .from('batches')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', batch.id);

    if (statusError) return apiError(ERRORS.INTERNAL.code, statusError.message, 500);

    const { error: statusAuditError } = await auditClient.from('audit_logs').insert({
      entity_type: 'batch',
      entity_id: batch.id,
      actor_id: user.id,
      action: 'update',
      summary: formatStatusAuditSummary(batch.status, nextStatus!),
    });

    if (statusAuditError) return apiError(ERRORS.INTERNAL.code, statusAuditError.message, 500);
  }

  // Get updated batch status (trigger may have updated it)
  const { data: updatedBatch } = await supabase
    .from('batches')
    .select('status')
    .eq('id', batch.id)
    .single();

  revalidateBatchViews(batchCode);
  return apiOk({ ok: true, eventId: event!.id, batchStatus: updatedBatch?.status ?? batch.status }, 201);
}

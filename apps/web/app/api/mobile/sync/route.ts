import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { BATCH_STATUS_LABELS, EVENT_TYPE_LABELS, mobileSyncRequestSchema } from '@bluefood/shared';
import type { BatchEventType, BatchStatus, MobileSyncResult } from '@bluefood/shared';
import { createClient } from '@supabase/supabase-js';
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

async function syncBatchStatusForEvent(
  serviceClient: any,
  batch: { id: string; status?: string | null },
  eventType: string,
  actorId: string
) {
  const nextStatus = EVENT_STATUS_UPDATES[eventType as BatchEventType];
  if (!shouldUpdateBatchStatus(batch.status, nextStatus)) return null;

  const { error: statusError } = await serviceClient
    .from('batches')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', batch.id);

  if (statusError) return statusError.message;

  const { error: statusAuditError } = await serviceClient.from('audit_logs').insert({
    entity_type: 'batch',
    entity_id: batch.id,
    actor_id: actorId,
    action: 'update',
    summary: formatStatusAuditSummary(batch.status, nextStatus!),
  });

  return statusAuditError?.message ?? null;
}

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch?.[1]) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user } } = await supabase.auth.getUser(bearerMatch[1].trim());
    return user;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const body = await request.json();
  const parsed = mobileSyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERRORS.VALIDATION_ERROR.code, parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ', 422);
  }

  const serviceClient = createSupabaseServiceClient();
  const results: MobileSyncResult[] = [];

  for (const mutation of parsed.data.mutations) {
    try {
      // Duplicate check
      const { data: existing } = await serviceClient
        .from('batch_events')
        .select('id, batch_id, event_type')
        .eq('client_mutation_id', mutation.clientMutationId)
        .single();

      if (existing) {
        const { data: existingBatch } = await serviceClient
          .from('batches')
          .select('id, status')
          .eq('id', existing.batch_id)
          .single();

        if (existingBatch) {
          const statusError = await syncBatchStatusForEvent(
            serviceClient,
            existingBatch,
            existing.event_type ?? mutation.eventType,
            user.id
          );
          if (statusError) {
            results.push({ clientMutationId: mutation.clientMutationId, status: 'failed', errorMessage: statusError });
            continue;
          }
        }

        revalidateBatchViews(mutation.batchCode);
        results.push({ clientMutationId: mutation.clientMutationId, status: 'duplicate', eventId: existing.id });
        continue;
      }

      // Find batch
      const { data: batch } = await serviceClient
        .from('batches')
        .select('id, status')
        .eq('batch_code', mutation.batchCode)
        .single();

      if (!batch) {
        results.push({ clientMutationId: mutation.clientMutationId, status: 'failed', errorMessage: 'Không tìm thấy lô hàng' });
        continue;
      }

      // Insert event
      const { data: event, error: eventError } = await serviceClient
        .from('batch_events')
        .insert({
          batch_id: batch.id,
          event_type: mutation.eventType,
          occurred_at: mutation.occurredAt,
          location_name: mutation.locationName,
          temperature_c: mutation.temperatureC,
          note: mutation.note,
          client_mutation_id: mutation.clientMutationId,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (eventError) {
        results.push({ clientMutationId: mutation.clientMutationId, status: 'failed', errorMessage: eventError.message });
        continue;
      }

      const { error: auditError } = await serviceClient.from('audit_logs').insert({
        entity_type: 'batch_events',
        entity_id: batch.id,
        actor_id: user.id,
        action: 'insert',
        summary: formatEventAuditSummary(mutation.eventType, mutation.note),
      });

      if (auditError) {
        results.push({ clientMutationId: mutation.clientMutationId, status: 'failed', errorMessage: auditError.message });
        continue;
      }

      const statusError = await syncBatchStatusForEvent(serviceClient, batch, mutation.eventType, user.id);
      if (statusError) {
        results.push({ clientMutationId: mutation.clientMutationId, status: 'failed', errorMessage: statusError });
        continue;
      }

      // Record sync mutation
      await serviceClient.from('sync_mutations').insert({
        client_mutation_id: mutation.clientMutationId,
        batch_id: batch.id,
        mutation_type: mutation.eventType,
        payload: mutation as any,
        result_status: 'synced',
        result_event_id: event!.id,
        created_by: user.id,
        processed_at: new Date().toISOString(),
      });

      revalidateBatchViews(mutation.batchCode);
      results.push({ clientMutationId: mutation.clientMutationId, status: 'synced', eventId: event!.id });
    } catch (err: any) {
      results.push({ clientMutationId: mutation.clientMutationId, status: 'failed', errorMessage: err?.message ?? 'Unknown error' });
    }
  }

  return apiOk({ results });
}

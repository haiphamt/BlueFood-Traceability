import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { getStoreScopeForUser, shipmentDestinationMatchesStore } from '@/lib/shipment-scope';

// planned → in_transit (admin/transporter dispatches)
// in_transit → delivered (store_staff confirms receipt)
const TRANSITIONS: Record<string, string> = {
  planned:    'in_transit',
  in_transit: 'delivered',
};

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const service = createSupabaseServiceClient();

  const { data: shipment, error: fetchErr } = await service
    .from('shipments')
    .select('id, batch_id, status, planned_arrival_at, to_location')
    .eq('id', id)
    .single();

  if (fetchErr || !shipment) {
    return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy chuyến hàng', 404);
  }

  const nextStatus = TRANSITIONS[shipment.status];
  if (!nextStatus) {
    return apiError('INVALID_TRANSITION', 'Không thể cập nhật trạng thái chuyến hàng này', 422);
  }

  const role = profile.role as string;
  const canDispatch = role === 'admin' || role === 'transporter';
  const canConfirmReceipt = role === 'admin' || role === 'store_staff';

  if (nextStatus === 'in_transit' && !canDispatch) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  if (nextStatus === 'delivered') {
    if (!canConfirmReceipt) {
      return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
    }

    if (role === 'store_staff') {
      const storeScope = await getStoreScopeForUser(service, user.id);
      if (!shipmentDestinationMatchesStore(shipment.to_location, storeScope)) {
        return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
      }
    }
  }

  const now = new Date().toISOString();

  // 1. Update shipment status + timestamp
  const timestampPatch: Record<string, string> = {};
  if (nextStatus === 'in_transit') timestampPatch.actual_departure_at = now;
  if (nextStatus === 'delivered')  timestampPatch.actual_arrival_at  = now;

  const { data: updatedShipment, error: shipmentErr } = await service
    .from('shipments')
    .update({ status: nextStatus, ...timestampPatch })
    .eq('id', id)
    .eq('status', shipment.status)
    .select('id')
    .maybeSingle();

  if (shipmentErr) return apiError(ERRORS.INTERNAL.code, shipmentErr.message, 500);
  if (!updatedShipment) return apiError('CONFLICT', 'Trạng thái chuyến hàng đã thay đổi', 409);

  const isLate =
    nextStatus !== 'delivered' &&
    !!shipment.planned_arrival_at &&
    new Date(shipment.planned_arrival_at) < new Date();

  if (nextStatus === 'in_transit') {
    // Record pickup/departure on the batch event timeline
    const { error: eventErr } = await service.from('batch_events').insert({
      batch_id:    shipment.batch_id,
      event_type:  'in_transit',
      occurred_at: now,
      note:        'Hàng đã được xuất kho, đang vận chuyển',
      shipment_id: shipment.id,
      is_late:     isLate,
      created_by:  user.id,
    });

    if (eventErr) return apiError(ERRORS.INTERNAL.code, eventErr.message, 500);
  }

  if (nextStatus === 'delivered') {
    // 2. Update related batch to received_at_store
    const { error: batchErr } = await service
      .from('batches')
      .update({ status: 'received_at_store' })
      .eq('id', shipment.batch_id);
    if (batchErr) return apiError(ERRORS.INTERNAL.code, batchErr.message, 500);

    // 3. Insert batch event visible on the public QR timeline
    const { error: eventErr } = await service.from('batch_events').insert({
      batch_id:    shipment.batch_id,
      event_type:  'received_at_store',
      occurred_at: now,
      note:        'Đã nhận tại CH',
      shipment_id: shipment.id,
      is_late:     false,
      created_by:  user.id,
    });
    if (eventErr) return apiError(ERRORS.INTERNAL.code, eventErr.message, 500);

    // 4. Audit log entry so admin/staff can see who confirmed receipt
    const shipCode = 'TRK-' + id.replace(/-/g, '').slice(0, 4).toUpperCase();
    const { error: auditErr } = await service.from('audit_logs').insert({
      entity_type: 'batch',
      entity_id:   shipment.batch_id,
      actor_id:    user.id,
      action:      'update',
      summary:     `Xác nhận nhận hàng tại cửa hàng — chuyến ${shipCode}`,
    });
    if (auditErr) return apiError(ERRORS.INTERNAL.code, auditErr.message, 500);
  }

  return apiOk({ ok: true, status: nextStatus });
}

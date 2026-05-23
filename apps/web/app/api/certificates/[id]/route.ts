import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { batchCodeFromRelation, revalidateCertificateViews } from '@/lib/cache-revalidation';
import { certificateAuditSummary, writeBatchAuditLog } from '@/lib/audit';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data, error } = await supabase.from('certificates').select('*, batches(batch_code)').eq('id', id).single();
  if (error || !data) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy chứng chỉ', 404);
  return apiOk(data);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'supplier'].includes(profile.role)) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const body = await request.json();
  const { batch_id, certificate_type, issuer, certificate_number, issued_at, expires_at, file_url } = body;
  if (!batch_id) return apiError(ERRORS.VALIDATION_ERROR.code, 'Lô hàng là bắt buộc', 422);
  if (!certificate_type?.trim()) return apiError(ERRORS.VALIDATION_ERROR.code, 'Loại chứng chỉ là bắt buộc', 422);

  const { data: existing } = await supabase
    .from('certificates')
    .select('id, batch_id, certificate_type, certificate_number, status, batches(batch_code)')
    .eq('id', id)
    .maybeSingle();

  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, supplier_id, batch_code')
    .eq('id', batch_id)
    .single();

  if (batchError || !batch) return apiError(ERRORS.VALIDATION_ERROR.code, 'Lô hàng không hợp lệ', 422);

  if (profile.role === 'supplier') {
    const { data: membership } = await supabase
      .from('supplier_users')
      .select('supplier_id')
      .eq('user_id', user.id)
      .eq('supplier_id', (batch as any).supplier_id)
      .maybeSingle();
    if (!membership) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const update: Record<string, unknown> = {
    batch_id,
    supplier_id: (batch as any).supplier_id,
    certificate_type: certificate_type.trim(),
    issuer: issuer || null,
    certificate_number: certificate_number || null,
    issued_at: issued_at || null,
    expires_at: expires_at || null,
    file_url: file_url || null,
  };

  if (profile.role === 'supplier') {
    update.status = 'pending_review';
    update.reviewed_by = null;
    update.reviewed_at = null;
  }

  const { error } = await supabase.from('certificates')
    .update(update)
    .eq('id', id);

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  const service = createSupabaseServiceClient();
  const auditError = await writeBatchAuditLog(service, {
    batchId: batch.id,
    actorId: user.id,
    action: 'update',
    entityType: 'certificates',
    summary: certificateAuditSummary('update', certificate_type, certificate_number),
    oldData: existing as any,
    newData: {
      id,
      batch_id,
      supplier_id: (batch as any).supplier_id,
      certificate_type: certificate_type.trim(),
      certificate_number: certificate_number || null,
      status: profile.role === 'supplier' ? 'pending_review' : (existing as any)?.status ?? null,
    },
  });
  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError, 500);
  const previousBatchCode = batchCodeFromRelation(existing as any);
  const nextBatchCode = (batch as any).batch_code;
  revalidateCertificateViews(previousBatchCode);
  if (nextBatchCode !== previousBatchCode) {
    revalidateCertificateViews(nextBatchCode);
  }
  return apiOk({ id, batchCode: nextBatchCode });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'supplier'].includes(profile.role)) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const { data: existing } = await supabase
    .from('certificates')
    .select('id, batch_id, certificate_type, certificate_number, status, batches(batch_code)')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('certificates').delete().eq('id', id);
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  if ((existing as any)?.batch_id) {
    const service = createSupabaseServiceClient();
    const auditError = await writeBatchAuditLog(service, {
      batchId: (existing as any).batch_id,
      actorId: user.id,
      action: 'delete',
      entityType: 'certificates',
      summary: certificateAuditSummary(
        'delete',
        (existing as any).certificate_type,
        (existing as any).certificate_number
      ),
      oldData: existing as any,
    });
    if (auditError) return apiError(ERRORS.INTERNAL.code, auditError, 500);
  }
  revalidateCertificateViews(batchCodeFromRelation(existing as any));
  return apiOk({ deleted: true });
}

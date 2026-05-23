import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { batchCodeFromRelation, revalidateCertificateViews } from '@/lib/cache-revalidation';
import { certificateAuditSummary, writeBatchAuditLog } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json();
  const certId = String(body.certificateId ?? '');
  const approved = body.approved !== false;
  if (!certId) return apiError(ERRORS.VALIDATION_ERROR.code, 'certificateId là bắt buộc', 422);

  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .select('id, batch_id, supplier_id, status, certificate_type, certificate_number, batches(batch_code)')
    .eq('id', certId)
    .eq('supplier_id', params.id)
    .single();

  if (certError || !cert) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy chứng chỉ', 404);
  if (approved && !cert.batch_id) {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Chứng chỉ phải gắn với lô hàng trước khi duyệt', 422);
  }

  const { error } = await supabase.from('certificates').update({
    status: approved ? 'active' : 'rejected',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', certId).eq('supplier_id', params.id);
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  await supabase.from('portal_notifications').insert({
    supplier_id: params.id,
    audience: 'supplier',
    type: 'certificate_reviewed',
    title: approved ? 'Chứng chỉ đã được duyệt ✓' : 'Chứng chỉ bị từ chối',
    entity_type: 'certificate',
    entity_id: certId,
  });

  const batchCode = batchCodeFromRelation(cert as any);
  if (cert.batch_id) {
    const service = createSupabaseServiceClient();
    const auditError = await writeBatchAuditLog(service, {
      batchId: cert.batch_id,
      actorId: user.id,
      action: 'update',
      entityType: 'certificates',
      summary: approved
        ? `Duyệt ${certificateAuditSummary('update', cert.certificate_type, cert.certificate_number).toLowerCase()}`
        : `Từ chối ${certificateAuditSummary('update', cert.certificate_type, cert.certificate_number).toLowerCase()}`,
      oldData: {
        id: cert.id,
        batch_id: cert.batch_id,
        status: cert.status,
      },
      newData: {
        id: cert.id,
        batch_id: cert.batch_id,
        status: approved ? 'active' : 'rejected',
      },
    });
    if (auditError) return apiError(ERRORS.INTERNAL.code, auditError, 500);
  }
  revalidateCertificateViews(batchCode);
  revalidatePath('/portal/certificates');
  revalidatePath(`/admin/suppliers/${params.id}`);
  return apiOk({ ok: true, batchCode });
}

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { addCertificateSchema } from '@bluefood/shared';
import { revalidateCertificateViews } from '@/lib/cache-revalidation';
import { certificateAuditSummary, writeBatchAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchCode: string }> }
) {
  const { batchCode } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'supplier'].includes(profile.role)) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const body = await request.json();
  const parsed = addCertificateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERRORS.VALIDATION_ERROR.code, parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ', 422);
  }

  const { data: batch } = await supabase
    .from('batches')
    .select('id, supplier_id')
    .eq('batch_code', batchCode)
    .single();

  if (!batch) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy lô hàng', 404);

  if (profile.role === 'supplier') {
    const { data: membership } = await supabase
      .from('supplier_users')
      .select('supplier_id')
      .eq('user_id', user.id)
      .eq('supplier_id', (batch as any).supplier_id)
      .maybeSingle();
    if (!membership) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from('certificates')
    .insert({
      batch_id: batch.id,
      supplier_id: (batch as any).supplier_id,
      certificate_type: input.certificateType,
      issuer: input.issuer,
      certificate_number: input.certificateNumber,
      issued_at: input.issuedAt,
      expires_at: input.expiresAt,
      file_url: input.fileUrl,
      status: profile.role === 'supplier' ? 'pending_review' : 'active',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  const service = createSupabaseServiceClient();
  const auditError = await writeBatchAuditLog(service, {
    batchId: batch.id,
    actorId: user.id,
    action: 'insert',
    entityType: 'certificates',
    summary: certificateAuditSummary('insert', input.certificateType, input.certificateNumber),
    newData: {
      id: data!.id,
      batch_id: batch.id,
      supplier_id: (batch as any).supplier_id,
      certificate_type: input.certificateType,
      certificate_number: input.certificateNumber ?? null,
      status: profile.role === 'supplier' ? 'pending_review' : 'active',
    },
  });
  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError, 500);

  revalidateCertificateViews(batchCode);
  return apiOk({ ok: true, certificateId: data!.id, batchCode }, 201);
}

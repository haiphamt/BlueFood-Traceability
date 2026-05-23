import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { revalidateCertificateViews } from '@/lib/cache-revalidation';
import { certificateAuditSummary, writeBatchAuditLog } from '@/lib/audit';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data, error } = await supabase
    .from('certificates')
    .select('*, batches(batch_code)')
    .order('created_at', { ascending: false });

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  return apiOk({ items: data ?? [] });
}

export async function POST(request: Request) {
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

  const { data, error } = await supabase
    .from('certificates')
    .insert({
      batch_id,
      supplier_id: (batch as any).supplier_id,
      certificate_type: certificate_type.trim(),
      issuer: issuer || null,
      certificate_number: certificate_number || null,
      issued_at: issued_at || null,
      expires_at: expires_at || null,
      file_url: file_url || null,
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
    summary: certificateAuditSummary('insert', certificate_type, certificate_number),
    newData: {
      id: data.id,
      batch_id,
      supplier_id: (batch as any).supplier_id,
      certificate_type: certificate_type.trim(),
      certificate_number: certificate_number || null,
      status: profile.role === 'supplier' ? 'pending_review' : 'active',
    },
  });
  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError, 500);
  revalidateCertificateViews((batch as any).batch_code);
  return apiOk({ id: data.id, batchCode: (batch as any).batch_code }, 201);
}

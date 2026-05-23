import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { certificateAuditSummary, writeBatchAuditLog } from '@/lib/audit';
import { revalidateCertificateViews } from '@/lib/cache-revalidation';
import { canEditPortal, requirePortalApiContext } from '@/lib/portal';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX_CERT_BYTES = 10 * 1024 * 1024;

export async function GET() {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;

  const { data, error } = await context.supabase
    .from('certificates')
    .select('*')
    .in('supplier_id', context.supplierIds)
    .order('created_at', { ascending: false });

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  return apiOk({ items: data ?? [] });
}

export async function POST(request: Request) {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;
  if (!canEditPortal(context.portalRole)) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return apiError(ERRORS.VALIDATION_ERROR.code, 'File PDF là bắt buộc', 422);
  if (file.type !== 'application/pdf') return apiError(ERRORS.VALIDATION_ERROR.code, 'Chỉ nhận file PDF', 422);
  if (file.size > MAX_CERT_BYTES) return apiError(ERRORS.VALIDATION_ERROR.code, 'File tối đa 10MB', 422);

  const certificateType = String(formData.get('certificate_type') ?? '').trim();
  const batchId = String(formData.get('batch_id') ?? '').trim();
  const issuer = String(formData.get('issuer') ?? '').trim();
  const certificateNumber = String(formData.get('certificate_number') ?? '').trim();
  const issuedAt = String(formData.get('issued_at') ?? '').trim();
  const expiresAt = String(formData.get('expires_at') ?? '').trim();
  if (!batchId || !certificateType || !issuer || !certificateNumber || !issuedAt || !expiresAt) {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Thiếu thông tin chứng chỉ', 422);
  }

  const { data: batch, error: batchError } = await context.supabase
    .from('batches')
    .select('id, supplier_id, batch_code')
    .eq('id', batchId)
    .in('supplier_id', context.supplierIds)
    .single();

  if (batchError || !batch) {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'LÃ´ hÃ ng khÃ´ng há»£p lá»‡ cho nhÃ  cung cáº¥p nÃ y', 422);
  }

  const supplierId = (batch as any).supplier_id ?? context.currentSupplier.id;
  const { data: cert, error: insertError } = await context.supabase
    .from('certificates')
    .insert({
      batch_id: batch.id,
      supplier_id: supplierId,
      certificate_type: certificateType,
      issuer,
      certificate_number: certificateNumber,
      issued_at: issuedAt,
      expires_at: expiresAt,
      status: 'pending_review',
      created_by: context.user.id,
    })
    .select('id')
    .single();

  if (insertError) return apiError(ERRORS.INTERNAL.code, insertError.message, 500);

  const storagePath = `${supplierId}/${cert.id}.pdf`;
  const { error: uploadError } = await context.supabase.storage
    .from('certificates')
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: true });

  if (uploadError) return apiError(ERRORS.INTERNAL.code, uploadError.message, 500);

  await context.supabase.from('certificates').update({ storage_path: storagePath }).eq('id', cert.id);
  await context.supabase.from('portal_notifications').insert({
    supplier_id: supplierId,
    audience: 'admin',
    type: 'certificate_uploaded',
    title: `${context.currentSupplier.name} vừa upload chứng chỉ mới`,
    entity_type: 'certificate',
    entity_id: cert.id,
  });

  const batchCode = (batch as any).batch_code;
  const service = createSupabaseServiceClient();
  const auditError = await writeBatchAuditLog(service, {
    batchId: batch.id,
    actorId: context.user.id,
    action: 'insert',
    entityType: 'certificates',
    summary: `${certificateAuditSummary('insert', certificateType, certificateNumber)} (chờ duyệt)`,
    newData: {
      id: cert.id,
      batch_id: batch.id,
      supplier_id: supplierId,
      certificate_type: certificateType,
      certificate_number: certificateNumber,
      status: 'pending_review',
      storage_path: storagePath,
    },
  });
  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError, 500);
  revalidateCertificateViews(batchCode);
  revalidatePath('/portal/certificates');
  revalidatePath(`/admin/suppliers/${supplierId}`);
  return apiOk({ id: cert.id, batchCode }, 201);
}

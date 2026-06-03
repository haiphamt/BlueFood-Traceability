import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { revalidatePath } from 'next/cache';

interface Params { params: Promise<{ id: string }> }

function revalidateSupplierViews() {
  revalidatePath('/suppliers');
  revalidatePath('/settings');
  revalidatePath('/batches');
  revalidatePath('/batches/new');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  revalidatePath('/admin/suppliers');
  revalidatePath('/portal/dashboard');
  revalidatePath('/portal/batches');
  revalidatePath('/portal/certificates');
}

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
  if (error || !data) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy nhà cung cấp', 404);
  return apiOk(data);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || profile.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json();
  const { name, contact_email, phone, address, province, certification_summary } = body;
  if (!name?.trim()) return apiError(ERRORS.VALIDATION_ERROR.code, 'Tên nhà cung cấp là bắt buộc', 422);

  const { error } = await supabase.from('suppliers')
    .update({ name: name.trim(), contact_email: contact_email || null, phone: phone || null, address: address || null, province: province || null, certification_summary: certification_summary || null, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  revalidateSupplierViews();
  return apiOk({ id });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || profile.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const service = createSupabaseServiceClient();
  const { data: supplier, error: supplierError } = await service
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (supplierError || !supplier) {
    return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy nhà cung cấp', 404);
  }

  const [
    { count: batchCount, error: batchCountError },
    { count: certificateCount, error: certificateCountError },
  ] = await Promise.all([
    service.from('batches').select('id', { count: 'exact', head: true }).eq('supplier_id', id),
    service.from('certificates').select('id', { count: 'exact', head: true }).eq('supplier_id', id),
  ]);

  if (batchCountError) return apiError(ERRORS.INTERNAL.code, batchCountError.message, 500);
  if (certificateCountError) return apiError(ERRORS.INTERNAL.code, certificateCountError.message, 500);

  const blockerMessages: string[] = [];
  if ((batchCount ?? 0) > 0) blockerMessages.push(`${batchCount} lô hàng`);
  if ((certificateCount ?? 0) > 0) blockerMessages.push(`${certificateCount} chứng chỉ`);

  if (blockerMessages.length > 0) {
    return apiError(
      ERRORS.VALIDATION_ERROR.code,
      `Không thể xóa cứng vì nhà cung cấp đang có ${blockerMessages.join(' và ')}. Hãy tạm ngưng đối tác để giữ lịch sử truy xuất.`,
      422
    );
  }

  const { error } = await service.from('suppliers').delete().eq('id', id);
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  const { error: auditError } = await service.from('audit_logs').insert({
    entity_type: 'suppliers',
    entity_id: id,
    actor_id: user.id,
    action: 'delete',
    summary: `Xóa nhà cung cấp ${supplier.name}`,
    old_data: supplier,
    new_data: null,
  });

  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError.message, 500);

  revalidateSupplierViews();
  return apiOk({ deleted: true });
}

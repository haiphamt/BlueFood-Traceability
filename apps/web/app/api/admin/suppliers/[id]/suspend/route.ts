import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface Params {
  params: Promise<{ id: string }>;
}

function revalidateSupplierViews(id: string) {
  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${id}/edit`);
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  revalidatePath('/batches');
  revalidatePath('/batches/new');
  revalidatePath('/admin/suppliers');
  revalidatePath(`/admin/suppliers/${id}`);
  revalidatePath('/portal/dashboard');
  revalidatePath('/portal/batches');
  revalidatePath('/portal/certificates');
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json().catch(() => ({}));
  const suspended = body.suspended !== false;
  const nextStatus = suspended ? 'suspended' : 'active';
  const service = createSupabaseServiceClient();

  const { data: supplier, error: supplierError } = await service
    .from('suppliers')
    .select('id, name, portal_status')
    .eq('id', id)
    .single();

  if (supplierError || !supplier) {
    return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy nhà cung cấp', 404);
  }

  const previousStatus = supplier.portal_status ?? 'active';
  if (previousStatus === nextStatus) {
    return apiOk({ ok: true, status: nextStatus });
  }

  const { error: updateError } = await service
    .from('suppliers')
    .update({ portal_status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) return apiError(ERRORS.INTERNAL.code, updateError.message, 500);

  const { error: auditError } = await service.from('audit_logs').insert({
    entity_type: 'suppliers',
    entity_id: id,
    actor_id: user.id,
    action: 'update',
    summary: suspended
      ? `Tạm ngưng nhà cung cấp ${supplier.name}`
      : `Mở lại nhà cung cấp ${supplier.name}`,
    old_data: { portal_status: previousStatus },
    new_data: { portal_status: nextStatus },
  });

  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError.message, 500);

  revalidateSupplierViews(id);
  return apiOk({ ok: true, status: nextStatus });
}

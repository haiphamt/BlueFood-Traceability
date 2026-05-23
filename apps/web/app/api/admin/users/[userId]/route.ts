import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const { userId } = params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (callerProfile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  let body: { role?: string; supplier_id?: string; store_id?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Dữ liệu không hợp lệ', 422);
  }

  const { role, supplier_id, store_id } = body;

  if (!role) return apiError(ERRORS.VALIDATION_ERROR.code, 'Vai trò là bắt buộc', 422);
  if (role === 'supplier' && !supplier_id)
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Vui lòng chọn nhà cung cấp', 422);
  if (role === 'store_staff' && !store_id)
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Vui lòng chọn cửa hàng', 422);

  const service = createSupabaseServiceClient();

  // 1. Update profile role
  const { error: roleError } = await service
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (roleError) return apiError(ERRORS.INTERNAL.code, roleError.message, 500);

  // 2. Clear all existing assignments
  await Promise.all([
    service.from('supplier_users').delete().eq('user_id', userId),
    service.from('store_users').delete().eq('user_id', userId),
  ]);

  // 3. Insert new assignment
  if (role === 'supplier' && supplier_id) {
    const { error } = await service.from('supplier_users').insert({
      user_id: userId,
      supplier_id,
      role: 'owner',
      accepted_at: new Date().toISOString(),
    });
    if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  } else if (role === 'store_staff' && store_id) {
    const { error } = await service.from('store_users').insert({ user_id: userId, store_id });
    if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  }

  // 4. Sync role into auth.users user_metadata so middleware fast-path routing stays correct
  await service.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });

  return apiOk({ ok: true });
}

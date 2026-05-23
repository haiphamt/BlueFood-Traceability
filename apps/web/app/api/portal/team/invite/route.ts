import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { canManageTeam, requirePortalApiContext } from '@/lib/portal';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;
  if (!canManageTeam(context.portalRole)) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = String(body.role ?? 'member');
  if (!email || !['manager', 'member'].includes(role)) return apiError(ERRORS.VALIDATION_ERROR.code, 'Email hoặc vai trò không hợp lệ', 422);

  const { count } = await context.supabase
    .from('supplier_users')
    .select('user_id', { count: 'exact', head: true })
    .eq('supplier_id', context.currentSupplier.id);

  if ((count ?? 0) >= 5) return apiError(ERRORS.VALIDATION_ERROR.code, 'Nhà cung cấp đã đủ 5 thành viên', 422);

  const { error } = await context.supabase.from('supplier_invites').upsert({
    supplier_id: context.currentSupplier.id,
    email,
    role,
    invited_by: context.user.id,
    status: 'pending',
  }, { onConflict: 'supplier_id,email' });
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  try {
    const admin = createSupabaseServiceClient();
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { role: 'supplier', supplier_id: context.currentSupplier.id, supplier_role: role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/portal/dashboard`,
    });
  } catch {
    // Local development can run without SMTP configured; the pending invite still appears in the portal.
  }

  return apiOk({ ok: true }, 201);
}

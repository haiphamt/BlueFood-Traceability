import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (callerProfile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const service = createSupabaseServiceClient();

  const [profilesRes, supplierUsersRes, storeUsersRes] = await Promise.all([
    service.from('profiles').select('user_id, email, full_name, role, created_at').order('created_at'),
    service.from('supplier_users').select('user_id, supplier_id, suppliers(id, name)'),
    service.from('store_users').select('user_id, store_id, stores(id, name)'),
  ]);

  if (profilesRes.error) return apiError(ERRORS.INTERNAL.code, profilesRes.error.message, 500);

  const supplierMap = new Map((supplierUsersRes.data ?? []).map((a: any) => [a.user_id, a]));
  const storeMap = new Map((storeUsersRes.data ?? []).map((a: any) => [a.user_id, a]));

  const users = (profilesRes.data ?? []).map((p: any) => {
    const sa = supplierMap.get(p.user_id) as any;
    const sta = storeMap.get(p.user_id) as any;
    const saSupplier = sa ? (Array.isArray(sa.suppliers) ? sa.suppliers[0] : sa.suppliers) : null;
    const staStore = sta ? (Array.isArray(sta.stores) ? sta.stores[0] : sta.stores) : null;
    return {
      user_id: p.user_id,
      email: p.email ?? '',
      full_name: p.full_name ?? '',
      role: p.role ?? 'viewer',
      created_at: p.created_at,
      assigned_supplier: saSupplier ? { id: sa.supplier_id, name: saSupplier.name ?? null } : null,
      assigned_store: staStore ? { id: sta.store_id, name: staStore.name ?? null } : null,
    };
  });

  return apiOk({ users });
}

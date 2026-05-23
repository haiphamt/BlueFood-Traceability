import { requireRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { UserRolesClient } from '@/components/user-roles-client';
import type { UserRow } from '@/components/user-roles-client';
import { Users, Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireRole(['admin']);

  const service = createSupabaseServiceClient();

  const [profilesRes, supplierUsersRes, storeUsersRes, suppliersRes, storesRes] = await Promise.all([
    service.from('profiles').select('user_id, email, full_name, role, created_at').order('created_at'),
    service.from('supplier_users').select('user_id, supplier_id, suppliers(id, name)'),
    service.from('store_users').select('user_id, store_id, stores(id, name)'),
    service.from('suppliers').select('id, name').order('name'),
    service.from('stores').select('id, name, province').order('name'),
  ]);

  console.log('[settings] storesRes.data length:', storesRes.data?.length ?? 'NULL', 'error:', storesRes.error?.message ?? 'none');

  const supplierMap = new Map((supplierUsersRes.data ?? []).map((a: any) => [a.user_id, a]));
  const storeMap    = new Map((storeUsersRes.data ?? []).map((a: any) => [a.user_id, a]));

  const users: UserRow[] = (profilesRes.data ?? []).map((p: any) => {
    const sa  = supplierMap.get(p.user_id) as any;
    const sta = storeMap.get(p.user_id) as any;
    const saSupplier  = sa  ? (Array.isArray(sa.suppliers)  ? sa.suppliers[0]  : sa.suppliers)  : null;
    const staStore    = sta ? (Array.isArray(sta.stores)     ? sta.stores[0]    : sta.stores)    : null;
    return {
      user_id:           p.user_id,
      email:             p.email ?? '',
      full_name:         p.full_name ?? '',
      role:              p.role ?? 'viewer',
      created_at:        p.created_at,
      assigned_supplier: saSupplier ? { id: sa.supplier_id, name: saSupplier.name ?? null } : null,
      assigned_store:    staStore   ? { id: sta.store_id,   name: staStore.name   ?? null } : null,
    };
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* Breadcrumb + header */}
      <div>
        <div className="admin-breadcrumb">
          <Home size={13} />
          <span>/</span>
          <span className="admin-breadcrumb-current">Cài đặt</span>
        </div>
        <h1 className="admin-page-title">
          Cài đặt
        </h1>
        <p className="admin-muted-strong text-sm mt-0.5">Quản lý cấu hình và phân quyền hệ thống.</p>
      </div>

      {/* Section card */}
      <div className="admin-card p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="admin-badge admin-badge-green p-1.5 rounded-lg">
            <Users size={16} />
          </div>
          <h2 className="admin-ink text-[13px] font-bold">Phân quyền người dùng</h2>
        </div>
        <p className="admin-muted-strong text-sm mb-5">
          Gán vai trò và liên kết tài khoản với nhà cung cấp hoặc cửa hàng tương ứng.
        </p>

        <UserRolesClient
          initialUsers={users}
          suppliers={suppliersRes.data ?? []}
          stores={storesRes.data ?? []}
        />
      </div>
    </div>
  );
}

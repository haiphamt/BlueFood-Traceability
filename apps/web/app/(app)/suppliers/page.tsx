import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CheckCircle2, PauseCircle, Plus, Pencil, Search, Home } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { SupplierLifecycleActions } from '@/components/admin/supplier-lifecycle-actions';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

function SupplierPortalStatusBadge({ status }: { status?: string | null }) {
  const suspended = status === 'suspended';

  return (
    <span className={`admin-badge gap-1.5 font-semibold ${suspended ? 'admin-badge-red' : 'admin-badge-green'}`}>
      {suspended ? <PauseCircle size={10} /> : <CheckCircle2 size={10} />}
      {suspended ? 'Tạm ngưng' : 'Hoạt động'}
    </span>
  );
}

export default async function SuppliersPage({ searchParams }: PageProps) {
  await requireRole(['admin']);
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase.from('suppliers').select('*', { count: 'exact' }).order('name');
  if (q) query = query.ilike('name', `%${q}%`);
  const { data: suppliers, count } = await query;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* Breadcrumb + header */}
      <div>
        <div className="admin-breadcrumb">
          <Home size={13} />
          <span>/</span>
          <span className="admin-breadcrumb-current">Nhà cung cấp</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="admin-page-title">
            Nhà cung cấp
          </h1>
          <Link
            href="/suppliers/new"
            className="admin-primary-button"
          >
            <Plus size={15} />
            Thêm nhà cung cấp
          </Link>
        </div>
      </div>

      {/* Search */}
      <form method="GET">
        <div className="flex gap-3 max-w-sm">
          <div className="relative flex-1">
            <Search size={15} className="admin-muted-strong absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm theo tên..."
              className="admin-input w-full pl-9 pr-4 h-9 text-[13px]"
            />
          </div>
          <button
            type="submit"
            className="admin-secondary-button h-9 px-4 !py-0"
          >
            Lọc
          </button>
        </div>
      </form>

      {/* Table card */}
      <div className="admin-card">
        <div className="admin-card-toolbar admin-muted-strong px-4 py-3 text-[12px] font-semibold">
          {count ?? 0} nhà cung cấp
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="admin-table-head-row">
                {['Tên', 'Email', 'Điện thoại', 'Tỉnh / Vùng', 'Trạng thái portal', 'Ngày tạo', 'Hành động'].map((h) => (
                  <th key={h} className="admin-th text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!suppliers || suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-muted-strong px-4 py-12 text-center text-sm">
                    Không tìm thấy nhà cung cấp nào
                  </td>
                </tr>
              ) : (
                suppliers.map((s: any) => (
                  <tr
                    key={s.id}
                    className="admin-row"
                  >
                    <td className="admin-ink px-4 py-3 font-semibold">{s.name}</td>
                    <td className="admin-muted px-4 py-3">{s.contact_email ?? '—'}</td>
                    <td className="admin-muted px-4 py-3">{s.phone ?? '—'}</td>
                    <td className="admin-muted px-4 py-3">{s.province ?? '—'}</td>
                    <td className="px-4 py-3">
                      <SupplierPortalStatusBadge status={s.portal_status} />
                    </td>
                    <td className="admin-muted-strong px-4 py-3 text-xs">{formatDateTime(s.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/suppliers/${s.id}/edit`}
                          className="admin-icon-button p-1.5"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={14} />
                        </Link>
                        <SupplierLifecycleActions id={s.id} name={s.name} portalStatus={s.portal_status} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

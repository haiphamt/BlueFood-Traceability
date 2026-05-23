import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminSuppliersPage() {
  await requireRole(['admin']);
  const supabase = await createSupabaseServerClient();
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, province, contact_email, portal_status, profile_review_status, supplier_users(user_id), certificates(id, status)')
    .order('name');

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Admin · Nhà cung cấp</h1>
          <p className="mt-1 text-sm text-muted">Duyệt hồ sơ, chứng chỉ và quản lý quyền truy cập portal.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#fbfcfa] text-left text-xs font-semibold text-muted">
              <tr><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Tỉnh</th><th className="px-4 py-3">Portal</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">Chờ duyệt</th></tr>
            </thead>
            <tbody>
              {(suppliers ?? []).map((supplier: any) => {
                const pendingCerts = (supplier.certificates ?? []).filter((c: any) => c.status === 'pending_review').length;
                return (
                  <tr key={supplier.id} className="border-t border-line">
                    <td className="px-4 py-3"><Link href={`/admin/suppliers/${supplier.id}`} className="font-bold text-brand-green">{supplier.name}</Link></td>
                    <td className="px-4 py-3">{supplier.province ?? '—'}</td>
                    <td className="px-4 py-3">{supplier.portal_status ?? 'active'}</td>
                    <td className="px-4 py-3">{supplier.supplier_users?.length ?? 0}</td>
                    <td className="px-4 py-3">{supplier.profile_review_status === 'pending_review' ? 'Hồ sơ' : ''} {pendingCerts ? `${pendingCerts} chứng chỉ` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

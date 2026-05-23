import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CertificateApprovalButton, SupplierApprovalActions, SupplierInviteForm } from '@/components/admin/supplier-admin-actions';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function AdminSupplierDetailPage({ params }: { params: { id: string } }) {
  await requireRole(['admin']);
  const supabase = await createSupabaseServerClient();
  const [{ data: supplier }, { data: batches }, { data: certs }, { data: team }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', params.id).single(),
    supabase.from('batches').select('id, batch_code, status, products(name)').eq('supplier_id', params.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('certificates').select('*, batches(batch_code)').eq('supplier_id', params.id).order('created_at', { ascending: false }),
    supabase.from('supplier_users').select('user_id, role, invited_at, accepted_at').eq('supplier_id', params.id),
  ]);

  if (!supplier) notFound();
  const pendingProfile = supplier.profile_review_status === 'pending_review';

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link href="/admin/suppliers" className="text-sm font-bold text-brand-green">← Tất cả nhà cung cấp</Link>
        <div>
          <h1 className="text-2xl font-bold text-ink">{supplier.name}</h1>
          <p className="mt-1 text-sm text-muted">{supplier.province ?? '—'} · Portal {supplier.portal_status ?? 'active'}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SupplierInviteForm supplierId={supplier.id} />
          <SupplierApprovalActions supplierId={supplier.id} pendingProfile={pendingProfile} />
        </div>

        {pendingProfile && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-bold text-amber-900">Hồ sơ chờ duyệt</h2>
            <pre className="mt-3 overflow-auto rounded-lg bg-white p-3 text-xs">{JSON.stringify(supplier.profile_draft, null, 2)}</pre>
          </section>
        )}

        <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <h2 className="font-bold text-ink">Chứng chỉ</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold text-muted">
                <tr><th className="py-2">Mã lô</th><th className="py-2">Loại</th><th className="py-2">Số</th><th className="py-2">Hết hạn</th><th className="py-2">Status</th><th className="py-2">Duyệt</th></tr>
              </thead>
              <tbody>
                {(certs ?? []).map((cert: any) => {
                  const batch = firstRelation<any>(cert.batches);
                  return (
                    <tr key={cert.id} className="border-t border-line">
                      <td className="py-2 font-mono font-bold">{batch?.batch_code ?? 'Thiếu lô'}</td>
                      <td className="py-2 font-bold">{cert.certificate_type}</td>
                      <td className="py-2">{cert.certificate_number ?? '—'}</td>
                      <td className="py-2">{formatDate(cert.expires_at)}</td>
                      <td className="py-2">{cert.status}</td>
                      <td className="py-2">
                        {cert.status === 'pending_review' && cert.batch_id && (
                          <div className="flex gap-2">
                            <CertificateApprovalButton supplierId={supplier.id} certificateId={cert.id} approved />
                            <CertificateApprovalButton supplierId={supplier.id} certificateId={cert.id} approved={false} />
                          </div>
                        )}
                        {cert.status === 'pending_review' && !cert.batch_id && (
                          <span className="text-xs font-bold text-amber-700">Gắn lô trước</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <h2 className="font-bold text-ink">Lô hàng</h2>
            <div className="mt-3 space-y-2">
              {(batches ?? []).map((batch: any) => (
                <div key={batch.id} className="flex justify-between rounded-lg bg-bg p-3 text-sm">
                  <span className="font-mono font-bold">{batch.batch_code}</span>
                  <span>{batch.status}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <h2 className="font-bold text-ink">Team</h2>
            <div className="mt-3 space-y-2">
              {(team ?? []).map((member: any) => (
                <div key={member.user_id} className="flex justify-between rounded-lg bg-bg p-3 text-sm">
                  <span className="font-mono text-xs">{member.user_id}</span>
                  <span className="font-bold">{member.role}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { requirePortalContext, statusForCertificate } from '@/lib/portal';
import { formatDate } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  active: 'portal-badge-green',
  expiring: 'portal-badge-orange',
  expired: 'portal-badge-red',
  pending_review: 'portal-badge-blue',
  rejected: 'portal-badge-red',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Hợp lệ',
  expiring: 'Sắp hết hạn',
  expired: 'Hết hạn',
  pending_review: 'Chờ duyệt',
  rejected: 'Từ chối',
};

function fallbackLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function PortalCertificatesPage() {
  const { supabase, supplierIds } = await requirePortalContext();
  const { data: certs } = await supabase
    .from('certificates')
    .select('*, batches(id, batch_code, products(name))')
    .in('supplier_id', supplierIds)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="portal-page-title">Chứng chỉ</h1>
          <p className="mt-1 text-sm portal-muted">Upload chứng chỉ mới theo từng lô hàng và theo dõi trạng thái duyệt.</p>
        </div>
        <Link href="/portal/certificates/new" className="portal-button-primary">Upload chứng chỉ mới</Link>
      </div>

      <div className="portal-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="portal-table-head text-left">
              <tr>
                <th className="px-4 py-3">Mã lô</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Tổ chức cấp</th>
                <th className="px-4 py-3">Số</th>
                <th className="px-4 py-3">Hiệu lực</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(certs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm portal-muted">
                    Chưa có chứng chỉ
                  </td>
                </tr>
              ) : (
                (certs ?? []).map((cert: any) => {
                  const status = statusForCertificate(cert.expires_at, cert.status);
                  const batch = firstRelation<any>(cert.batches);
                  return (
                    <tr key={cert.id} className="portal-table-row">
                      <td className="px-4 py-3">
                        {batch?.batch_code ? (
                          <Link href={`/portal/batches/${cert.batch_id}`} className="portal-link font-mono font-bold">
                            {batch.batch_code}
                          </Link>
                        ) : (
                          <span className="text-[#ffb77a]">Thiếu lô</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">{cert.certificate_type}</td>
                      <td className="px-4 py-3">{cert.issuer ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{cert.certificate_number ?? '—'}</td>
                      <td className="px-4 py-3 text-xs portal-muted">{formatDate(cert.issued_at)} &rarr; {formatDate(cert.expires_at)}</td>
                      <td className="px-4 py-3">{cert.storage_path ? <a href={`/api/portal/certificates/${cert.id}/download`} className="portal-link">Tải file</a> : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`portal-badge ${STATUS_STYLE[status] ?? 'portal-badge-muted'}`}>
                          {STATUS_LABEL[status] ?? fallbackLabel(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { statusForCertificate } from '@/lib/portal';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ShieldCheck, CheckCircle2, Clock, AlertTriangle,
  FileText, Plus, Pencil, ChevronLeft, ChevronRight, Home,
} from 'lucide-react';
import { CertificatesSearch } from '@/components/certificates-search';
import { DeleteButton } from '@/components/delete-button';
import { CertificateApprovalButton } from '@/components/admin/supplier-admin-actions';

const PAGE_SIZE = 10;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

function certAbbr(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('vietgap')) return 'VG';
  if (t.includes('globalgap')) return 'GG';
  if (t.includes('organic') || t.includes('usda')) return 'O';
  if (t.includes('iso')) return 'ISO';
  if (t.includes('haccp')) return 'HCP';
  return type.slice(0, 3).toUpperCase();
}

function buildHref(page: number, q?: string) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return `/certificates${qs ? '?' + qs : ''}`;
}

const CERT_STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  active: {
    badge: 'admin-badge-green',
    dot: 'bg-emerald-700 dark:bg-[#22c55e]',
    label: 'Còn hiệu lực',
  },
  expiring: {
    badge: 'admin-badge-orange',
    dot: 'bg-orange-700 dark:bg-[#ffb77a]',
    label: 'Sắp hết hạn',
  },
  expired: {
    badge: 'admin-badge-red',
    dot: 'bg-red-700 dark:bg-[#ffb4ab]',
    label: 'Hết hạn',
  },
  pending_review: {
    badge: 'admin-badge-blue',
    dot: 'bg-blue-700 dark:bg-[#adc6ff]',
    label: 'Chờ duyệt',
  },
  rejected: {
    badge: 'admin-badge-red',
    dot: 'bg-red-700 dark:bg-[#ffb4ab]',
    label: 'Từ chối',
  },
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function getPages(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (page > 3) pages.push('...');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
  if (page < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

function MiniBarChart({ bars, color }: { bars: readonly number[]; color: string }) {
  return (
    <div className="flex h-12 w-20 flex-shrink-0 items-end gap-[4px]">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-[3px] min-h-[4px]"
          style={{
            height: `${h}%`,
            backgroundColor: color,
            opacity: 0.28 + (i / Math.max(1, bars.length - 1)) * 0.72,
          }}
        />
      ))}
    </div>
  );
}

export default async function CertificatesPage({ searchParams }: PageProps) {
  const { q, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const [supabase, profile] = await Promise.all([
    createSupabaseServerClient(),
    getProfile(),
  ]);
  const isAdmin = profile?.role === 'admin';

  const { data: allStatus } = await supabase.from('certificates').select('expires_at, status');
  let validCount = 0, expiringSoonCount = 0, expiredCount = 0;
  for (const c of allStatus ?? []) {
    const statusKey = statusForCertificate(c.expires_at, (c as any).status);
    if (statusKey === 'expired') expiredCount++;
    else if (statusKey === 'expiring') expiringSoonCount++;
    else if (statusKey === 'active') validCount++;
  }
  const totalCount = allStatus?.length ?? 0;

  let matchingBatchIds: string[] = [];
  if (q) {
    const { data: matchedBatches } = await supabase
      .from('batches')
      .select('id')
      .ilike('batch_code', `%${q}%`);

    matchingBatchIds = (matchedBatches ?? []).map((batch: any) => batch.id);
  }

  let query = supabase
    .from('certificates')
    .select('*, batches(batch_code)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (q) {
    const searchParts = [
      `certificate_number.ilike.%${q}%`,
      `certificate_type.ilike.%${q}%`,
      `issuer.ilike.%${q}%`,
    ];
    if (matchingBatchIds.length > 0) {
      searchParts.push(`batch_id.in.(${matchingBatchIds.join(',')})`);
    }
    query = query.or(searchParts.join(','));
  }

  const { data: certs, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fromRow = total > 0 ? offset + 1 : 0;
  const toRow = Math.min(offset + PAGE_SIZE, total);

  const statsCards = [
    {
      label: 'Tổng số',
      value: totalCount,
      icon: ShieldCheck,
      footer: 'chứng chỉ trong hệ thống',
      tag: 'Tổng quan',
      bars: [34, 46, 58, 52, 70, 64, 82],
      barColor: '#8fb3ff',
      dotColor: '#8fb3ff',
      iconBg: 'bg-blue-100 dark:bg-[rgba(143,179,255,0.14)]',
      iconColor: 'text-blue-700 dark:text-[#adc6ff]',
      valueClass: 'text-blue-700 dark:text-[#adc6ff]',
      borderCls: 'border-line dark:border-[#2a2a2d] hover:border-blue-200 dark:hover:border-[rgba(173,198,255,0.30)]',
      bgCls: 'bg-panel dark:bg-[#171717]',
    },
    {
      label: 'Còn hiệu lực',
      value: validCount,
      icon: CheckCircle2,
      footer: 'được phép hiển thị truy xuất',
      tag: 'Hiệu lực',
      bars: [42, 50, 58, 70, 66, 78, 88],
      barColor: '#22c55e',
      dotColor: '#22c55e',
      iconBg: 'bg-emerald-100 dark:bg-[rgba(34,197,94,0.14)]',
      iconColor: 'text-emerald-700 dark:text-[#22c55e]',
      valueClass: 'text-emerald-700 dark:text-[#22c55e]',
      borderCls: 'border-line dark:border-[#2a2a2d] hover:border-emerald-200 dark:hover:border-[rgba(34,197,94,0.30)]',
      bgCls: 'bg-panel dark:bg-[#171717]',
    },
    {
      label: 'Sắp hết hạn',
      value: expiringSoonCount,
      icon: Clock,
      footer: 'trong 30 ngày tới',
      tag: 'Cảnh báo',
      bars: [26, 38, 45, 58, 68, 78, 72],
      barColor: '#fb923c',
      dotColor: '#fb923c',
      iconBg: 'bg-orange-100 dark:bg-[rgba(251,146,60,0.14)]',
      iconColor: 'text-orange-700 dark:text-[#ffb77a]',
      valueClass: 'text-orange-700 dark:text-[#ffb77a]',
      borderCls: 'border-line dark:border-[#2a2a2d] hover:border-amber-200 dark:hover:border-[rgba(255,183,122,0.30)]',
      bgCls: expiringSoonCount > 0 ? 'bg-orange-50/40 dark:bg-[rgba(251,146,60,0.04)]' : 'bg-panel dark:bg-[#171717]',
    },
    {
      label: 'Đã hết hiệu lực',
      value: expiredCount,
      icon: AlertTriangle,
      footer: expiredCount > 0 ? 'cần cập nhật hoặc thay thế' : 'không có chứng chỉ quá hạn',
      tag: 'Quá hạn',
      bars: [24, 34, 48, 62, 72, 80, 68],
      barColor: '#f87171',
      dotColor: '#f87171',
      iconBg: 'bg-red-100 dark:bg-[rgba(248,113,113,0.14)]',
      iconColor: 'text-red-700 dark:text-[#ffb4ab]',
      valueClass: 'text-red-700 dark:text-[#ffb4ab]',
      borderCls: expiredCount > 0
        ? 'border-red-200 dark:border-[rgba(248,113,113,0.22)] hover:border-red-300 dark:hover:border-[rgba(248,113,113,0.36)]'
        : 'border-line dark:border-[#2a2a2d] hover:border-red-200 dark:hover:border-[rgba(248,113,113,0.28)]',
      bgCls: expiredCount > 0 ? 'bg-red-50/40 dark:bg-[rgba(248,113,113,0.04)]' : 'bg-panel dark:bg-[#171717]',
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* Breadcrumb + header */}
      <div>
        <div className="admin-breadcrumb">
          <Home size={13} />
          <span>/</span>
          <span className="admin-breadcrumb-current">Chứng chỉ</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="admin-page-title">
            Chứng chỉ
          </h1>
          {isAdmin && (
            <Link
              href="/certificates/new"
              className="admin-primary-button"
            >
              <Plus size={15} />
              Thêm chứng chỉ
            </Link>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ label, value, icon: Icon, footer, bars, barColor, iconBg, iconColor, valueClass, borderCls, bgCls }) => (
          <div
            key={label}
            className={[
              'group rounded-2xl border p-5 flex flex-col gap-3',
              'transition-all duration-200 hover:-translate-y-0.5',
              bgCls,
              borderCls,
            ].join(' ')}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
                <Icon size={17} strokeWidth={1.8} className={iconColor} />
              </div>
              <span className="text-[12px] font-medium admin-muted leading-snug">{label}</span>
            </div>

            <div className="flex items-end justify-between gap-2">
              <p className={`text-4xl font-black leading-none ${valueClass}`}>{value.toLocaleString('vi-VN')}</p>
              <MiniBarChart bars={bars} color={barColor} />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[11px] admin-muted">{footer}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="admin-card">

        {/* Header */}
        <div
          className="admin-card-toolbar p-4 flex justify-between items-center"
        >
          <h3 className="admin-ink text-[13px] font-semibold">Danh sách chứng chỉ</h3>
          <CertificatesSearch />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="admin-table-head-row">
                {['Mã lô', 'Loại', 'Tổ chức cấp', 'Số chứng chỉ', 'Hiệu lực', 'Trạng thái', 'File', 'Hành động'].map((h) => (
                  <th key={h} className="admin-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!certs || certs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-muted-strong px-4 py-16 text-center text-sm">
                    Chưa có chứng chỉ
                  </td>
                </tr>
              ) : (
                certs.map((c: any) => {
                  const abbr = certAbbr(c.certificate_type ?? '');
                  const batch = firstRelation<any>(c.batches);
                  const certStatus = statusForCertificate(c.expires_at, c.status);
                  const statusCfg = CERT_STATUS_STYLE[certStatus] ?? CERT_STATUS_STYLE.active;
                  const isExpired = certStatus === 'expired';
                  const canReview = c.status === 'pending_review' && c.batch_id && c.supplier_id;
                  const fileHref = c.file_url || (c.storage_path ? `/api/admin/certificates/${c.id}/download` : null);

                  return (
                    <tr
                      key={c.id}
                      className="admin-row group"
                    >
                      <td className="px-4 py-3">
                        {batch?.batch_code ? (
                          <Link
                            href={`/batches/${batch.batch_code}`}
                            className="admin-link font-mono font-semibold"
                          >
                            {batch.batch_code}
                          </Link>
                        ) : (
                          <span className="text-xs font-semibold text-orange-700 dark:text-[#ffb77a]">Thiếu lô</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="admin-badge admin-badge-blue w-6 h-6 justify-center rounded text-[10px] font-bold flex-shrink-0 !px-0">
                            {abbr}
                          </div>
                          <span className="admin-ink">{c.certificate_type}</span>
                        </div>
                      </td>
                      <td className="admin-muted px-4 py-3 text-sm">{c.issuer ?? '—'}</td>
                      <td className="admin-muted px-4 py-3 font-mono text-[13px]">{c.certificate_number ?? '—'}</td>
                      <td className={`px-4 py-3 text-sm ${isExpired ? 'text-red-700 dark:text-[#ffb4ab]' : 'admin-muted'}`}>
                        {formatDate(c.expires_at) ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`admin-badge ${statusCfg.badge} gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fileHref ? (
                          <a
                            href={fileHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#9ca3af] dark:hover:text-[#f5f5f5] dark:hover:bg-[#2a2a2d] transition-colors"
                            title="Tải xuống PDF"
                          >
                            <FileText size={15} />
                          </a>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 text-slate-300 dark:text-[#737373] opacity-30">
                            <FileText size={15} />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            {canReview && (
                              <>
                                <CertificateApprovalButton supplierId={c.supplier_id} certificateId={c.id} approved />
                                <CertificateApprovalButton supplierId={c.supplier_id} certificateId={c.id} approved={false} />
                              </>
                            )}
                            {c.status === 'pending_review' && !c.batch_id && (
                              <span className="text-xs font-semibold text-orange-700 dark:text-[#ffb77a]">Gắn lô trước</span>
                            )}
                            <Link
                              href={`/certificates/${c.id}/edit`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#737373] dark:hover:text-[#f5f5f5] dark:hover:bg-[#2a2a2d] transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={13} />
                            </Link>
                            <DeleteButton id={c.id} name={c.certificate_type} resource="certificates" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="admin-card-footer px-4 py-3 flex items-center justify-between">
          <span className="admin-muted-strong text-[13px]">
            {fromRow}–{toRow} trong {total.toLocaleString('vi-VN')} kết quả
          </span>
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link href={buildHref(page - 1, q)} className="admin-icon-button p-1">
                <ChevronLeft size={18} />
              </Link>
            ) : (
              <span className="admin-icon-button p-1 opacity-30 cursor-not-allowed"><ChevronLeft size={18} /></span>
            )}
            {getPages(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="admin-muted-strong px-1 text-sm">…</span>
              ) : (
                <Link
                  key={p}
                  href={buildHref(p as number, q)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-accent text-[#003824]'
                      : 'border border-line text-ink hover:bg-[var(--color-surface-2)] dark:border-[#2a2a2d] dark:text-[#f5f5f5] dark:hover:bg-[#1f1f22]'
                  }`}
                >
                  {p}
                </Link>
              )
            )}
            {page < totalPages ? (
              <Link href={buildHref(page + 1, q)} className="admin-icon-button p-1">
                <ChevronRight size={18} />
              </Link>
            ) : (
              <span className="admin-icon-button p-1 opacity-30 cursor-not-allowed"><ChevronRight size={18} /></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

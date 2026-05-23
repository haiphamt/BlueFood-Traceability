import Link from 'next/link';
import { AlertTriangle, ChevronRight, Clock3, FileCheck, Package, QrCode, Truck } from 'lucide-react';
import { ClickableTableRow } from '@/components/clickable-table-row';
import { requirePortalContext } from '@/lib/portal';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const BATCH_STATUS_LABEL: Record<string, string> = {
  created: 'Đã tạo',
  harvested: 'Đã thu hoạch',
  packed: 'Đã đóng gói',
  quality_checked: 'Đã kiểm tra CL',
  in_transit: 'Đang vận chuyển',
  received_at_store: 'Đã nhận tại CH',
  sold: 'Đã bán',
  draft: 'Nháp',
  recalled: 'Thu hồi',
  cancelled: 'Đã hủy',
};

const BATCH_STATUS_STYLE: Record<string, string> = {
  draft: 'portal-badge-blue',
  created: 'portal-badge-blue',
  harvested: 'portal-badge-green',
  packed: 'portal-badge-green',
  quality_checked: 'portal-badge-green',
  in_transit: 'portal-badge-purple',
  received_at_store: 'portal-badge-green',
  sold: 'portal-badge-green',
  recalled: 'portal-badge-red',
  cancelled: 'portal-badge-muted',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  created: 'Tạo lô hàng',
  harvested: 'Thu hoạch',
  packed: 'Đóng gói',
  quality_checked: 'Kiểm tra chất lượng',
  pickup: 'Lấy hàng',
  in_transit: 'Đang vận chuyển',
  delivered: 'Đã giao hàng',
  received_at_store: 'Nhận tại cửa hàng',
  sold: 'Đã bán',
  issue_reported: 'Báo lỗi',
  correction: 'Chỉnh sửa',
};

function nestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function fallbackLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusLabel(status: string | null | undefined) {
  return status ? BATCH_STATUS_LABEL[status] ?? fallbackLabel(status) : '—';
}

function statusBadgeClass(status: string | null | undefined) {
  return status ? BATCH_STATUS_STYLE[status] ?? 'portal-badge-muted' : 'portal-badge-muted';
}

function eventLabel(eventType: string | null | undefined) {
  return eventType ? EVENT_TYPE_LABEL[eventType] ?? fallbackLabel(eventType) : 'Cập nhật';
}

function MiniBarChart({ bars, color }: { bars: readonly number[]; color: string }) {
  return (
    <div className="flex h-10 w-16 flex-shrink-0 items-end gap-[3px]">
      {bars.map((h, i) => (
        <div
          key={i}
          className="min-h-[3px] flex-1 rounded-[2px]"
          style={{
            height: `${h}%`,
            backgroundColor: color,
            opacity: 0.25 + (i / Math.max(1, bars.length - 1)) * 0.75,
          }}
        />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
  footer,
  bars,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  footer: string;
  bars: readonly number[];
  color: string;
  bg: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: bg }}
        >
          <Icon size={17} style={{ color }} strokeWidth={1.8} />
        </div>
        <span className="text-[12px] font-medium leading-snug portal-muted">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-4xl font-black leading-none" style={{ color }}>{value}</p>
        <MiniBarChart bars={bars} color={color} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] portal-muted">{footer}</p>
        {href ? (
          <ChevronRight size={12} className="flex-shrink-0 -translate-x-1 opacity-0 transition-all duration-200 portal-muted group-hover:translate-x-0 group-hover:opacity-60" />
        ) : (
          <span className="h-3 w-3 flex-shrink-0" />
        )}
      </div>
    </>
  );
  const className = [
    'group rounded-2xl border border-white/[0.08] bg-[#171717] p-5 flex flex-col gap-3',
    'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-[#1f1f22]',
  ].join(' ');

  if (href) {
    return (
      <Link href={href} className={`${className} focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export default async function PortalDashboardPage() {
  const { supabase, supplierIds } = await requirePortalContext();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const in30Days = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: batches },
    { data: certs },
    { data: scans },
    { data: events },
    { data: lateShipments },
  ] = await Promise.all([
    supabase
      .from('batches')
      .select('id, batch_code, status, updated_at, products(name), certificates(id)')
      .in('supplier_id', supplierIds)
      .order('updated_at', { ascending: false }),
    supabase
      .from('certificates')
      .select('id, batch_id, certificate_type, issuer, expires_at, status')
      .in('supplier_id', supplierIds)
      .order('expires_at'),
    supabase
      .from('qr_scan_logs')
      .select('id, batch_id, scanned_at, batches!inner(supplier_id)')
      .in('batches.supplier_id', supplierIds)
      .gte('scanned_at', monthStart),
    supabase
      .from('batch_events')
      .select('id, event_type, occurred_at, note, batches!inner(id, batch_code, supplier_id)')
      .in('batches.supplier_id', supplierIds)
      .order('occurred_at', { ascending: false })
      .limit(8),
    supabase
      .from('shipments')
      .select('id, batch_id, planned_arrival_at, to_location, batches!inner(id, batch_code, supplier_id)')
      .in('batches.supplier_id', supplierIds)
      .eq('status', 'in_transit')
      .lt('planned_arrival_at', now.toISOString())
      .limit(5),
  ]);

  const batchRows = batches ?? [];
  const recentBatchRows = batchRows.slice(0, 10);
  const certRows = certs ?? [];
  const activeBatches = batchRows.filter((b: any) => !['sold', 'cancelled', 'recalled'].includes(b.status)).length;
  const activeCerts = certRows.filter((c: any) => c.status === 'active' && (!c.expires_at || c.expires_at >= today)).length;
  const inTransit = batchRows.filter((b: any) => b.status === 'in_transit').length;
  const expiringCerts = certRows.filter((c: any) => c.expires_at && c.expires_at >= today && c.expires_at <= in30Days);
  const expiredCerts = certRows.filter((c: any) => c.expires_at && c.expires_at < today);
  const missingCertBatches = batchRows.filter((b: any) => (b.certificates ?? []).length === 0);
  const staleBatches = batchRows.filter((b: any) => Date.now() - new Date(b.updated_at).getTime() > 7 * 86_400_000);

  const actionItems = [
    ...expiredCerts.map((cert: any) => ({
      key: `expired-${cert.id}`,
      href: '/portal/certificates',
      tone: 'red',
      title: `${cert.certificate_type} đã hết hạn`,
      meta: cert.expires_at ? `Hết hạn ngày ${formatDate(cert.expires_at)}` : 'Cần cập nhật chứng chỉ',
    })),
    ...(lateShipments ?? []).map((shipment: any) => {
      const batch = nestedOne<any>(shipment.batches);
      return {
        key: `late-${shipment.id}`,
        href: batch?.id ? `/portal/batches/${batch.id}` : '/portal/batches',
        tone: 'red',
        title: `Lô ${batch?.batch_code ?? shipment.batch_id} đang vận chuyển trễ`,
        meta: shipment.planned_arrival_at ? `ETA ${formatDateTime(shipment.planned_arrival_at)}` : 'Quá hạn ETA',
      };
    }),
    ...expiringCerts.map((cert: any) => ({
      key: `expiring-${cert.id}`,
      href: '/portal/certificates',
      tone: 'orange',
      title: `${cert.certificate_type} sắp hết hạn`,
      meta: `Hết hạn ngày ${formatDate(cert.expires_at)}`,
    })),
    ...missingCertBatches.map((batch: any) => ({
      key: `missing-cert-${batch.id}`,
      href: `/portal/batches/${batch.id}`,
      tone: 'orange',
      title: `Lô ${batch.batch_code} thiếu chứng chỉ`,
      meta: 'Bổ sung chứng chỉ',
    })),
    ...staleBatches.map((batch: any) => ({
      key: `stale-${batch.id}`,
      href: `/portal/batches/${batch.id}`,
      tone: 'muted',
      title: `Lô ${batch.batch_code} chưa có cập nhật gần đây`,
      meta: `Cập nhật cuối ${formatDateTime(batch.updated_at)}`,
    })),
  ];
  const visibleActionItems = actionItems.slice(0, 3);
  const eventRows = events ?? [];
  const visibleEvents = eventRows.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="portal-page-title">Dashboard nhà cung cấp</h1>
        <p className="mt-1 text-sm portal-muted">Tổng quan dữ liệu công khai và vận hành của nhà cung cấp.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Lô hàng đang hoạt động"
          value={activeBatches}
          icon={Package}
          href="/portal/batches"
          footer={`trong ${batchRows.length} lô tổng cộng`}
          bars={[42, 55, 48, 66, 72, 80, 68, 86]}
          color="#8fb3ff"
          bg="rgba(143,179,255,0.14)"
        />
        <MetricCard
          label="Chứng chỉ còn hiệu lực"
          value={`${activeCerts} / ${certRows.length}`}
          icon={FileCheck}
          href="/portal/certificates"
          footer="hồ sơ được duyệt"
          bars={[38, 48, 60, 56, 68, 74, 70, 82]}
          color="#22c55e"
          bg="rgba(34,197,94,0.14)"
        />
        <MetricCard
          label="Lô hàng đang vận chuyển"
          value={inTransit}
          icon={Truck}
          href="/portal/batches"
          footer="đang trên đường"
          bars={[24, 40, 50, 46, 62, 58, 76, 70]}
          color="#ddb7ff"
          bg="rgba(221,183,255,0.14)"
        />
        <MetricCard
          label="QR quét tháng này"
          value={scans?.length ?? 0}
          icon={QrCode}
          footer="lượt quét trong tháng"
          bars={[34, 46, 58, 52, 70, 64, 82, 76]}
          color="#fb923c"
          bg="rgba(251,146,60,0.14)"
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="portal-card flex flex-col overflow-hidden lg:h-[320px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-[#ffb77a]" />
                <h2 className="portal-section-title truncate">Cần xử lý</h2>
              </div>
              <span className="portal-badge portal-badge-orange shrink-0">{actionItems.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-3 pb-4">
              {visibleActionItems.length === 0 ? (
                <p className="rounded-md border border-white/[0.08] bg-white/[0.03] p-2 text-sm portal-muted">Chưa có việc cần xử lý.</p>
              ) : visibleActionItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="portal-timeline-item flex cursor-pointer gap-2 p-2"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone === 'red' ? 'bg-[#ffb4ab]' : item.tone === 'orange' ? 'bg-[#ffb77a]' : 'bg-[#737373]'}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs portal-muted">{item.meta}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex-shrink-0 border-t border-white/[0.08] px-4 py-3">
              <Link href="/portal/batches" className="portal-link text-xs">Xem tất cả cảnh báo →</Link>
            </div>
          </div>
        </div>

        <div className="portal-card flex flex-col overflow-hidden lg:h-[320px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Clock3 size={16} className="shrink-0 text-emerald-400" />
                <h2 className="portal-section-title truncate">Hoạt động gần đây</h2>
              </div>
              <span className="portal-badge portal-badge-muted shrink-0">{eventRows.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-3 pb-4">
              {visibleEvents.length === 0 ? (
                <p className="rounded-md border border-white/[0.08] bg-white/[0.03] p-2 text-sm portal-muted">Chưa có hoạt động gần đây.</p>
              ) : visibleEvents.map((event: any) => {
              const batch = nestedOne<any>(event.batches);
              const content = (
                <>
                  <p className="truncate text-sm font-bold text-white">
                    {batch?.batch_code ? <span className="font-mono">{batch.batch_code} · </span> : null}{eventLabel(event.event_type)}
                  </p>
                  <p className="mt-0.5 truncate text-xs portal-muted">{formatDateTime(event.occurred_at)}</p>
                </>
              );

              return batch?.id ? (
                <Link key={event.id} href={`/portal/batches/${batch.id}`} className="portal-timeline-item block cursor-pointer p-2">
                  {content}
                </Link>
              ) : (
                <div key={event.id} className="portal-timeline-item p-2">{content}</div>
              );
            })}
            </div>
            <div className="flex-shrink-0 border-t border-white/[0.08] px-4 py-3">
              <Link href="/portal/batches" className="portal-link text-xs">Xem tất cả hoạt động →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-card">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <h2 className="portal-section-title">10 lô hàng gần nhất</h2>
          <Link href="/portal/batches" className="portal-link text-sm">Xem tất cả</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="portal-table-head text-left">
              <tr>
                <th className="px-4 py-3">Mã lô</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {recentBatchRows.map((batch: any) => {
                const product = nestedOne<any>(batch.products);
                return (
                  <ClickableTableRow key={batch.id} href={`/portal/batches/${batch.id}`} className="portal-table-row">
                    <td className="px-4 py-3 font-mono font-bold text-white">{batch.batch_code}</td>
                    <td className="px-4 py-3">{product?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`portal-badge ${statusBadgeClass(batch.status)}`}>
                        {statusLabel(batch.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs portal-muted">{formatDateTime(batch.updated_at)}</td>
                  </ClickableTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

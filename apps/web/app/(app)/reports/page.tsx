import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { BATCH_STATUSES, BATCH_STATUS_LABELS } from '@bluefood/shared';
import { ReportsPeriodBar } from '@/components/reports-period-bar';
import { formatDate, formatDateTime, formatNumber } from '@/lib/utils';
import { daysBetween, groupDate, parseReportFilters, shipmentCode, toNumber } from '@/lib/reports';
import { Package, Truck, QrCode, ShieldAlert, Download, Home, ChevronRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import type { BatchStatus } from '@bluefood/shared';
import type { LucideIcon } from 'lucide-react';

function MiniBarChart({ bars, color }: { bars: number[]; color: string }) {
  return (
    <div className="flex items-end gap-[3px] h-10 w-16 flex-shrink-0">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            height: `${h}%`,
            backgroundColor: color,
            opacity: 0.25 + (i / Math.max(1, bars.length - 1)) * 0.75,
          }}
          className="flex-1 rounded-[2px] min-h-[3px]"
        />
      ))}
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string; granularity?: string }>;
}

interface KpiItem {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: LucideIcon;
  href: string;
  footer: string;
  bars: number[];
  borderHover: string;
}

const STATUS_BAR_COLOR: Partial<Record<BatchStatus, string>> = {
  draft:             '#4a5568',
  created:           '#adc6ff',
  harvested:         '#22c55e',
  packed:            '#22c55e',
  quality_checked:   '#22c55e',
  in_transit:        '#ddb7ff',
  received_at_store: '#22c55e',
  sold:              '#22c55e',
  recalled:          '#ffb4ab',
  cancelled:         '#737373',
};

const ACTIVE_STATUSES = new Set<BatchStatus>([
  'created',
  'harvested',
  'packed',
  'quality_checked',
  'in_transit',
  'received_at_store',
]);

function paramsFromObject(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) params.set(key, value);
  }
  return params;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireRole(['admin']);

  const rawParams = await searchParams;
  const filters = parseReportFilters(paramsFromObject(rawParams));
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];

  const supabase = await createSupabaseServerClient();

  const [batchesRes, qrRes, certsRes, shipmentsRes, blockchainRes] = await Promise.all([
    (() => {
      let q = supabase
        .from('batches')
        .select('id, batch_code, status, product_id, supplier_id, quantity, unit, harvest_date, expiration_date, origin_location, created_at, products(name, category), suppliers(name, province)')
        .order('created_at', { ascending: false });
      if (filters.gte) q = q.gte('created_at', filters.gte);
      if (filters.lt) q = q.lt('created_at', filters.lt);
      return q;
    })(),
    (() => {
      let q = supabase
        .from('qr_scan_logs')
        .select('id, batch_id, batch_code, source, scanned_at')
        .order('scanned_at', { ascending: false })
        .limit(2000);
      if (filters.gte) q = q.gte('scanned_at', filters.gte);
      if (filters.lt) q = q.lt('scanned_at', filters.lt);
      return q;
    })(),
    supabase
      .from('certificates')
      .select('id, certificate_type, certificate_number, issuer, status, issued_at, expires_at, batches(batch_code, suppliers(name))')
      .lte('expires_at', in30Days)
      .gte('expires_at', today)
      .order('expires_at')
      .limit(20),
    (() => {
      let q = supabase
        .from('shipments')
        .select('id, status, vehicle_code, transporter_name, planned_arrival_at, actual_arrival_at, from_location, to_location, batches(batch_code, suppliers(name))')
        .not('planned_arrival_at', 'is', null)
        .order('planned_arrival_at', { ascending: true })
        .limit(1000);
      if (filters.gte) q = q.gte('planned_arrival_at', filters.gte);
      if (filters.lt) q = q.lt('planned_arrival_at', filters.lt);
      return q;
    })(),
    supabase
      .from('batch_blockchain')
      .select('id, status, tx_hash, anchored_at, batches(batch_code)')
      .limit(1000),
  ]);

  const batches = batchesRes.data ?? [];
  const qrRows = qrRes.data ?? [];
  const certRows = certsRes.data ?? [];
  const shipmentRows = shipmentsRes.data ?? [];
  const blockchainRows = blockchainRes.error ? [] : blockchainRes.data ?? [];
  const total = batches.length;

  const lateShipments = shipmentRows.filter((shipment: any) => {
    if (!shipment.planned_arrival_at) return false;
    const planned = new Date(shipment.planned_arrival_at);
    const actual = shipment.actual_arrival_at ? new Date(shipment.actual_arrival_at) : null;
    if (actual) return actual.getTime() > planned.getTime();
    return planned.getTime() < now.getTime() && shipment.status !== 'delivered';
  });

  const statusCounts: Record<string, number> = {};
  for (const batch of batches) {
    statusCounts[batch.status] = (statusCounts[batch.status] ?? 0) + 1;
  }

  const activeCount = batches.filter((batch) => ACTIVE_STATUSES.has(batch.status as BatchStatus)).length;
  const qrCount = qrRows.length;
  const certsExpiring = certRows.length;
  const lateCount = lateShipments.length;

  const productMap: Record<string, { name: string; count: number; quantity: number }> = {};
  for (const batch of batches) {
    if (!batch.product_id) continue;
    const name = (batch.products as any)?.name ?? 'Không rõ';
    if (!productMap[batch.product_id]) productMap[batch.product_id] = { name, count: 0, quantity: 0 };
    productMap[batch.product_id].count++;
    productMap[batch.product_id].quantity += toNumber(batch.quantity);
  }
  const top5Products = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxProduct = top5Products[0]?.count || 1;

  const supplierMap: Record<string, { name: string; count: number; quantity: number }> = {};
  for (const batch of batches) {
    if (!batch.supplier_id) continue;
    const name = (batch.suppliers as any)?.name ?? 'Không rõ';
    if (!supplierMap[batch.supplier_id]) supplierMap[batch.supplier_id] = { name, count: 0, quantity: 0 };
    supplierMap[batch.supplier_id].count++;
    supplierMap[batch.supplier_id].quantity += toNumber(batch.quantity);
  }
  const top5Suppliers = Object.values(supplierMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxSupplier = top5Suppliers[0]?.count || 1;

  const timelineMap: Record<string, { label: string; batches: number; qrScans: number; lateShipments: number }> = {};
  function bucket(label: string) {
    if (!timelineMap[label]) timelineMap[label] = { label, batches: 0, qrScans: 0, lateShipments: 0 };
    return timelineMap[label];
  }
  for (const batch of batches) bucket(groupDate(batch.created_at, filters.granularity)).batches++;
  for (const scan of qrRows) bucket(groupDate(scan.scanned_at, filters.granularity)).qrScans++;
  for (const shipment of lateShipments) bucket(groupDate((shipment as any).planned_arrival_at, filters.granularity)).lateShipments++;
  const timeline = Object.values(timelineMap).sort((a, b) => a.label.localeCompare(b.label)).slice(-8);

  const blockchainConfirmed = blockchainRows.filter((row: any) => row.status === 'confirmed').length;
  const blockchainPending = blockchainRows.filter((row: any) => row.status === 'pending').length;

  const exportHref = `/api/reports/export${filters.exportQuery ? `?${filters.exportQuery}` : ''}`;

  const kpiItems: KpiItem[] = [
    { label: 'Tổng lô hàng', value: total, color: '#adc6ff', bg: 'rgba(173,198,255,0.10)', icon: Package, href: '/batches', footer: 'lô trong kỳ báo cáo', bars: [40, 60, 50, 80, 70, 90, 60, 80], borderHover: 'hover:border-blue-200 dark:hover:border-[rgba(173,198,255,0.3)]' },
    { label: 'Lô đang hoạt động', value: activeCount, color: '#22c55e', bg: 'rgba(34,197,94,0.10)', icon: Package, href: '/batches', footer: 'đang trong chuỗi', bars: [30, 50, 70, 60, 80, 70, 90, 80], borderHover: 'hover:border-emerald-200 dark:hover:border-[rgba(34,197,94,0.3)]' },
    { label: 'Lượt quét QR', value: qrCount, color: '#fb923c', bg: 'rgba(251,146,60,0.10)', icon: QrCode, href: '/reports', footer: 'lượt quét ghi nhận', bars: [50, 40, 60, 50, 70, 60, 80, 70], borderHover: 'hover:border-orange-200 dark:hover:border-[rgba(251,146,60,0.3)]' },
    { label: 'Chứng chỉ sắp hết hạn', value: certsExpiring, color: '#ffb77a', bg: 'rgba(255,183,122,0.10)', icon: ShieldAlert, href: '/certificates', footer: 'cần kiểm tra sớm', bars: [60, 50, 40, 60, 50, 70, 60, 50], borderHover: 'hover:border-amber-200 dark:hover:border-[rgba(255,183,122,0.3)]' },
    { label: 'Vận chuyển trễ ETA', value: lateCount, color: '#ffb4ab', bg: 'rgba(255,180,171,0.10)', icon: Truck, href: '/shipments', footer: 'chuyến cần xử lý', bars: [30, 35, 45, 40, 55, 60, 50, 65], borderHover: 'hover:border-red-200 dark:hover:border-[rgba(255,180,171,0.3)]' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div>
        <div className="admin-breadcrumb">
          <Home size={13} />
          <span>/</span>
          <span className="admin-breadcrumb-current">Báo cáo</span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="admin-page-title">Báo cáo hệ thống</h1>
            <p className="admin-muted-strong text-sm mt-0.5">{filters.label}</p>
          </div>
          <a href={exportHref} className="admin-primary-button flex-shrink-0">
            <Download size={14} />
            Xuất báo cáo Excel
          </a>
        </div>
      </div>

      <ReportsPeriodBar />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpiItems.map(({ label, value, color, bg, icon: Icon, href, footer, bars, borderHover }) => (
          <Link
            key={label}
            href={href}
            className={[
              'group rounded-2xl border p-5 flex flex-col gap-3',
              'transition-all duration-200 hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0d0d0f]',
              'bg-panel dark:bg-[#171717] border-line dark:border-[#2a2a2d]',
              borderHover,
            ].join(' ')}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: bg }}
              >
                <Icon size={17} style={{ color }} strokeWidth={1.8} />
              </div>
              <span className="text-[12px] font-medium admin-muted leading-snug">{label}</span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <p className="text-4xl font-black leading-none" style={{ color }}>
                {value.toLocaleString('vi-VN')}
              </p>
              <MiniBarChart bars={bars} color={color} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] admin-muted">{footer}</p>
              <ChevronRight size={12} className="admin-muted flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="admin-ink text-sm font-semibold">Lô hàng theo trạng thái</h2>
            <span className="admin-muted-strong text-[11px]">{total} lô</span>
          </div>
          <div className="space-y-3">
            {BATCH_STATUSES.map((status) => {
              const count = statusCounts[status] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const barColor = STATUS_BAR_COLOR[status] ?? '#737373';
              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="admin-muted text-[11px] truncate pr-2">{BATCH_STATUS_LABELS[status]}</span>
                    <span className="admin-ink text-[11px] font-semibold">
                      {count} <span className="admin-muted-strong">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[var(--color-surface-2)] dark:bg-[#1f1f22]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-card p-5">
          <h2 className="admin-ink text-sm font-semibold mb-4">Top 5 sản phẩm</h2>
          {top5Products.length === 0 ? (
            <p className="admin-muted-strong text-xs text-center py-4">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3.5">
              {top5Products.map(({ name, count }, index) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="admin-muted-strong text-[10px] font-bold w-4 flex-shrink-0 text-right">{index + 1}.</span>
                      <span className="admin-muted text-[11px] truncate">{name}</span>
                    </div>
                    <span className="text-[11px] font-bold flex-shrink-0 ml-2" style={{ color: '#22c55e' }}>{count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[var(--color-surface-2)] dark:bg-[#1f1f22]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((count / maxProduct) * 100)}%`, backgroundColor: '#22c55e' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card p-5">
          <h2 className="admin-ink text-sm font-semibold mb-4">Top 5 nhà cung cấp</h2>
          {top5Suppliers.length === 0 ? (
            <p className="admin-muted-strong text-xs text-center py-4">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3.5">
              {top5Suppliers.map(({ name, count }, index) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="admin-muted-strong text-[10px] font-bold w-4 flex-shrink-0 text-right">{index + 1}.</span>
                      <span className="admin-muted text-[11px] truncate">{name}</span>
                    </div>
                    <span className="text-[11px] font-bold flex-shrink-0 ml-2" style={{ color: '#ddb7ff' }}>{count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[var(--color-surface-2)] dark:bg-[#1f1f22]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((count / maxSupplier) * 100)}%`, backgroundColor: '#ddb7ff' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card lg:col-span-2">
          <div className="admin-card-toolbar px-4 py-3 flex items-center justify-between">
            <h2 className="admin-ink text-[13px] font-semibold flex items-center gap-2">
              <CalendarDays size={14} className="text-accent" />
              Thống kê theo thời gian
            </h2>
            <span className="admin-muted-strong text-[11px]">
              {filters.granularity === 'week' ? 'Tuần' : filters.granularity === 'year' ? 'Năm' : 'Tháng'}
            </span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line dark:border-[#2a2a2d]">
                <th className="admin-th px-4 py-2 text-[10px]">Mốc thời gian</th>
                <th className="admin-th px-4 py-2 text-[10px] text-right">Lô hàng</th>
                <th className="admin-th px-4 py-2 text-[10px] text-right">QR scans</th>
                <th className="admin-th px-4 py-2 text-[10px] text-right">Trễ ETA</th>
              </tr>
            </thead>
            <tbody>
              {timeline.length > 0 ? timeline.map((item) => (
                <tr key={item.label} className="admin-row">
                  <td className="admin-ink px-4 py-2.5 text-[12px] font-semibold">{item.label}</td>
                  <td className="admin-muted px-4 py-2.5 text-right text-[12px]">{item.batches.toLocaleString('vi-VN')}</td>
                  <td className="admin-muted px-4 py-2.5 text-right text-[12px]">{item.qrScans.toLocaleString('vi-VN')}</td>
                  <td className="admin-muted px-4 py-2.5 text-right text-[12px]">{item.lateShipments.toLocaleString('vi-VN')}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="admin-muted-strong px-4 py-8 text-center text-sm">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-card p-5">
          <h2 className="admin-ink text-sm font-semibold mb-4">Blockchain</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="admin-muted text-[12px]">Đã xác thực</span>
              <span className="text-[13px] font-bold text-accent">{blockchainConfirmed.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="admin-muted text-[12px]">Đang xử lý</span>
              <span className="text-[13px] font-bold" style={{ color: '#ffb77a' }}>{blockchainPending.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="admin-muted text-[12px]">Tổng bản ghi</span>
              <span className="admin-ink text-[13px] font-bold">{blockchainRows.length.toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="admin-card">
          <div className="admin-card-toolbar px-4 py-3 flex items-center justify-between">
            <h2 className="admin-ink text-[13px] font-semibold flex items-center gap-2">
              <ShieldAlert size={14} style={{ color: '#ffb77a' }} />
              Chứng chỉ sắp hết hạn (30 ngày)
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,183,122,0.12)', color: '#ffb77a' }}>
              {certsExpiring}
            </span>
          </div>
          {certRows.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line dark:border-[#2a2a2d]">
                  <th className="admin-th px-4 py-2 text-[10px]">Loại chứng chỉ</th>
                  <th className="admin-th px-4 py-2 text-[10px]">Mã lô / NCC</th>
                  <th className="admin-th px-4 py-2 text-[10px] text-right">Hết hạn</th>
                </tr>
              </thead>
              <tbody>
                {certRows.slice(0, 8).map((cert: any) => {
                  const daysLeft = Math.ceil((new Date(cert.expires_at).getTime() - now.getTime()) / 86_400_000);
                  return (
                    <tr key={cert.id} className="admin-row">
                      <td className="admin-ink px-4 py-2.5 text-[12px] font-medium">{cert.certificate_type}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-[11px] font-medium" style={{ color: '#22c55e' }}>{cert.batches?.batch_code ?? '—'}</div>
                        <div className="admin-muted-strong text-[10px]">{(cert.batches?.suppliers as any)?.name ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="text-[11px] font-semibold" style={{ color: '#ffb77a' }}>{formatDate(cert.expires_at)}</div>
                        <div className="admin-muted-strong text-[10px]">còn {Math.max(0, daysLeft)} ngày</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="admin-muted-strong px-4 py-8 text-center text-sm">Không có chứng chỉ sắp hết hạn</p>
          )}
        </div>

        <div className="admin-card">
          <div className="admin-card-toolbar px-4 py-3 flex items-center justify-between">
            <h2 className="admin-ink text-[13px] font-semibold flex items-center gap-2">
              <Truck size={14} style={{ color: '#ffb77a' }} />
              Vận chuyển trễ ETA
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,183,122,0.12)', color: '#ffb77a' }}>
              {lateCount}
            </span>
          </div>
          {lateShipments.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line dark:border-[#2a2a2d]">
                  <th className="admin-th px-4 py-2 text-[10px]">Mã chuyến</th>
                  <th className="admin-th px-4 py-2 text-[10px]">Mã lô / Lộ trình</th>
                  <th className="admin-th px-4 py-2 text-[10px] text-right">ETA dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {lateShipments.slice(0, 8).map((shipment: any) => {
                  const overdueDays = daysBetween(shipment.planned_arrival_at, shipment.actual_arrival_at ? new Date(shipment.actual_arrival_at) : now);
                  return (
                    <tr key={shipment.id} className="admin-row">
                      <td className="px-4 py-2.5">
                        <div className="admin-ink text-[12px] font-bold">{shipmentCode(shipment.id)}</div>
                        <div className="admin-muted-strong text-[10px]">{shipment.vehicle_code ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[11px] font-medium" style={{ color: '#22c55e' }}>{(shipment.batches as any)?.batch_code ?? '—'}</div>
                        <div className="admin-muted-strong text-[10px] truncate max-w-[180px]">
                          {shipment.from_location ?? '—'} {'->'} {shipment.to_location ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="text-[11px] font-semibold" style={{ color: '#ffb77a' }}>{formatDateTime(shipment.planned_arrival_at)}</div>
                        <div className="text-[10px]" style={{ color: '#ffb4ab' }}>trễ {Math.max(1, overdueDays)} ngày</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="admin-muted-strong px-4 py-8 text-center text-sm">Không có chuyến hàng trễ ETA</p>
          )}
        </div>
      </div>
    </div>
  );
}

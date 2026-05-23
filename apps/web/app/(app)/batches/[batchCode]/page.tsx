import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import { BatchTimeline, type BlockchainRecord } from '@/components/batch-timeline';
import { BlockchainBadge } from '@/components/blockchain-badge';
import { QrCodeCard } from '@/components/qr-code-card';
import { AddEventDialog } from '@/components/add-event-dialog';
import { formatDate, formatDateTime, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Info, Route, BookOpen, Award, ShieldCheck, Globe, Plus, Home } from 'lucide-react';
import type { BatchStatus, BatchEvent, BatchEventType } from '@bluefood/shared';
import { AutoRefresh } from '@/components/auto-refresh';

interface PageProps {
  params: Promise<{ batchCode: string }>;
}

const ACTION_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  insert: { label: 'Tạo',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  update: { label: 'Sửa',  color: '#ffb77a', bg: 'rgba(255,183,122,0.12)' },
  delete: { label: 'Xóa',  color: '#ffb4ab', bg: 'rgba(255,180,171,0.12)' },
};

const STATUS_ORDER: Record<BatchStatus, number> = {
  draft: 0,
  created: 1,
  harvested: 2,
  packed: 3,
  quality_checked: 4,
  in_transit: 5,
  received_at_store: 6,
  sold: 7,
  recalled: 8,
  cancelled: 9,
};

const EVENT_STATUS_UPDATES: Partial<Record<BatchEventType, BatchStatus>> = {
  created: 'created',
  harvested: 'harvested',
  packed: 'packed',
  quality_checked: 'quality_checked',
  pickup: 'in_transit',
  in_transit: 'in_transit',
  delivered: 'received_at_store',
  received_at_store: 'received_at_store',
  sold: 'sold',
  recalled: 'recalled',
};

function deriveBatchStatus(status: string | null | undefined, events: BatchEvent[]) {
  if (status === 'cancelled' || status === 'recalled') return status as BatchStatus;

  let derivedStatus = (status ?? 'created') as BatchStatus;
  let derivedOrder = STATUS_ORDER[derivedStatus] ?? -1;

  for (const event of events) {
    const eventStatus = EVENT_STATUS_UPDATES[event.eventType as BatchEventType];
    if (!eventStatus || eventStatus === 'recalled') continue;

    const eventOrder = STATUS_ORDER[eventStatus] ?? -1;
    if (eventOrder >= derivedOrder) {
      derivedStatus = eventStatus;
      derivedOrder = eventOrder;
    }
  }

  return derivedStatus;
}

export default async function BatchDetailPage({ params }: PageProps) {
  const { batchCode } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();

  const { data: batch } = await service
    .from('batches')
    .select(`*, products(*), suppliers(*), certificates(*), shipments(*), batch_events(*)`)
    .eq('batch_code', batchCode)
    .single();

  if (!batch) notFound();

  const certificateIds = ((batch.certificates ?? []) as any[])
    .map((cert) => cert.id)
    .filter(Boolean);
  const auditEntityFilter = certificateIds.length > 0
    ? `entity_id.eq.${batch.id},entity_id.in.(${certificateIds.join(',')})`
    : `entity_id.eq.${batch.id}`;

  const { data: rawAuditLogs } = await service
    .from('audit_logs')
    .select('*')
    .or(auditEntityFilter)
    .order('created_at', { ascending: false })
    .limit(40);

  const batchScopedCertificateLogs = new Set(
    ((rawAuditLogs ?? []) as any[])
      .filter((log) => log.entity_id === batch.id && log.entity_type === 'certificates')
      .map((log) => `${log.action}:${log.new_data?.id ?? log.old_data?.id ?? ''}`)
  );
  const auditLogs = ((rawAuditLogs ?? []) as any[])
    .filter((log) => {
      if (log.entity_id === batch.id || log.entity_type !== 'certificates') return true;
      const certificateLogKey = `${log.action}:${log.new_data?.id ?? log.old_data?.id ?? log.entity_id}`;
      return !batchScopedCertificateLogs.has(certificateLogKey);
    })
    .slice(0, 20);

  // Supabase returns snake_case columns; map to camelCase BatchEvent interface
  const events = ((batch.batch_events ?? []) as any[]).map((e): BatchEvent => ({
    id: e.id,
    eventType: e.event_type ?? e.eventType ?? '',
    occurredAt: e.occurred_at ?? e.occurredAt ?? '',
    locationName: e.location_name ?? e.locationName ?? null,
    temperatureC: e.temperature_c ?? e.temperatureC ?? null,
    note: e.note ?? null,
    isLate: e.is_late ?? e.isLate ?? false,
  })).sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  const { data: blockchainRows } = await service
    .from('batch_blockchain')
    .select('id, batch_event_id, status, tx_hash')
    .eq('batch_id', batch.id);

  const DB_TO_BADGE: Record<string, BlockchainRecord['status']> = {
    confirmed: 'verified', pending: 'pending', failed: 'failed',
  };

  const blockchainMap: Record<string, BlockchainRecord> = {};
  for (const row of blockchainRows ?? []) {
    const eventId = (row as any).batch_event_id;
    if (eventId) {
      blockchainMap[eventId] = {
        jobId: row.id,
        status: DB_TO_BADGE[(row as any).status] ?? 'not_anchored',
        txHash: (row as any).tx_hash ?? undefined,
      };
    }
  }

  const confirmedCount = (blockchainRows ?? []).filter((r: any) => r.status === 'confirmed').length;
  const totalEvents = events.length;
  const allConfirmed = totalEvents > 0 && confirmedCount === totalEvents;
  const integrityPct = totalEvents > 0 ? Math.round((confirmedCount / totalEvents) * 100) : 0;
  const effectiveStatus = deriveBatchStatus(batch.status, events);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const traceUrl = batch.qr_url ?? `${appUrl}/trace/${batchCode}`;

  const infoRows = [
    ['Khối lượng',    `${formatNumber(batch.quantity)} ${batch.unit}`],
    ['Ngày thu hoạch', formatDate(batch.harvest_date)],
    ['Hạn sử dụng',   formatDate(batch.expiration_date)],
    ['Xuất xứ',       batch.origin_location],
    ['Nhà cung cấp',  (batch.suppliers as any)?.name],
    ['Sản phẩm',      (batch.products as any)?.name],
  ].filter(([, v]) => v);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <AutoRefresh intervalMs={5000} />

      {/* Breadcrumb */}
      <div className="admin-breadcrumb">
        <Home size={13} />
        <span>/</span>
        <Link href="/batches" className="hover:underline">Lô hàng</Link>
        <span>/</span>
        <span className="admin-breadcrumb-current">{batchCode}</span>
      </div>

      {/* Header card */}
      <div
        className="admin-form-card p-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/batches" className="admin-icon-button p-1.5">
              <ArrowLeft size={18} />
            </Link>
            <h2 className="admin-ink text-2xl font-bold">
              {(batch.products as any)?.name ?? batchCode}
            </h2>
            <span
              className="admin-badge admin-badge-blue flex items-center gap-1 text-xs font-semibold px-3 py-1"
            >
              #{batchCode}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-9">
            <StatusBadge status={effectiveStatus} />
            <BlockchainBadge
              initialStatus={allConfirmed ? 'verified' : confirmedCount > 0 ? 'pending' : 'not_anchored'}
            />
            {batch.updated_at && (
              <span className="admin-muted text-xs">
                Cập nhật: {formatDateTime(batch.updated_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/trace/${batchCode}`}
            target="_blank"
            className="admin-secondary-button flex items-center gap-2 px-3.5 py-2 text-sm font-medium"
          >
            <Globe size={15} />
            Trang công khai
          </Link>
          <AddEventDialog batchCode={batchCode} />
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left column */}
        <div className="lg:col-span-8 flex flex-col gap-5">

          {/* Batch info */}
          <div className="admin-form-card p-5">
            <div className="admin-section-divider flex items-center gap-2 mb-4 pb-3 border-b">
              <Info size={16} className="text-accent" />
              <h3 className="admin-ink text-[13px] font-semibold">Thông tin lô hàng</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {infoRows.map(([label, value]) => (
                <div key={label as string} className="flex flex-col gap-0.5">
                  <span className="admin-muted-strong text-[11px] font-semibold uppercase tracking-wider">{label}</span>
                  <span className="admin-ink text-sm font-medium">{value ?? '—'}</span>
                </div>
              ))}
              {batch.notes && (
                <div className="flex flex-col gap-0.5 md:col-span-2">
                  <span className="admin-muted-strong text-[11px] font-semibold uppercase tracking-wider">Ghi chú</span>
                  <p className="admin-muted text-sm">{batch.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="admin-form-card p-5">
            <div className="admin-section-divider flex items-center justify-between mb-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Route size={16} className="text-accent" />
                <h3 className="admin-ink text-[13px] font-semibold">Lịch trình chuỗi cung ứng</h3>
              </div>
              <span className="admin-muted-strong text-xs font-medium">{totalEvents} sự kiện</span>
            </div>
            <BatchTimeline events={events} blockchainMap={blockchainMap} />
          </div>

          {/* Audit log */}
          {auditLogs && auditLogs.length > 0 && (
            <div className="admin-card">
              <div className="admin-section-divider flex items-center gap-2 px-5 py-4 border-b">
                <BookOpen size={16} className="text-accent" />
                <h3 className="admin-ink text-[13px] font-semibold">Nhật ký Audit (Blockchain)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="admin-table-head-row">
                      {['Thời gian', 'Hành động', 'Loại', 'Mô tả', 'Trạng thái'].map((h) => (
                        <th key={h} className="admin-th px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => {
                      const s = ACTION_LABEL[log.action] ?? { label: log.action, color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' };
                      return (
                        <tr
                          key={log.id}
                          className="admin-row transition-colors"
                        >
                          <td className="admin-muted px-4 py-3 text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{ color: s.color, backgroundColor: s.bg }}>
                              {s.label}
                            </span>
                          </td>
                          <td className="admin-muted px-4 py-3 text-xs font-mono">{log.entity_type}</td>
                          <td className="admin-ink px-4 py-3 text-sm max-w-[240px] truncate">{log.summary}</td>
                          <td className="px-4 py-3 text-right">
                            <ShieldCheck size={16} className="text-accent inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* QR card */}
          <QrCodeCard batchCode={batchCode} traceUrl={traceUrl} />

          {/* Certificates */}
          <div className="admin-form-card p-5">
            <div className="admin-section-divider flex items-center justify-between mb-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-accent" />
                <h3 className="admin-ink text-[13px] font-semibold">Chứng chỉ</h3>
              </div>
            </div>
            {batch.certificates && batch.certificates.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {batch.certificates.map((cert: any) => (
                  <li
                    key={cert.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-line transition-colors hover:bg-[var(--color-surface-2)] dark:border-[#2a2a2d] dark:hover:bg-[#1f1f22]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Award size={16} className="admin-muted-strong flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="admin-ink text-sm font-medium truncate">{cert.certificate_type}</p>
                        <p className="admin-muted-strong text-xs truncate">{cert.issuer} · {cert.certificate_number}</p>
                      </div>
                    </div>
                    <span
                      className="admin-badge admin-badge-green inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium flex-shrink-0 ml-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      Còn hiệu lực
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-muted text-sm text-center py-4">Chưa có chứng chỉ</p>
            )}
            <Link
              href={`/certificates/new?batch_id=${batch.id}`}
              className="admin-secondary-button w-full mt-3 py-2 text-sm font-medium"
            >
              <Plus size={14} />
              Liên kết chứng chỉ mới
            </Link>
          </div>

          {/* Blockchain transparency */}
          <div className="admin-form-card p-5">
            <h3 className="admin-ink text-[13px] font-semibold mb-4">Trạng thái minh bạch</h3>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 border-2 border-emerald-300 dark:bg-[rgba(34,197,94,0.10)] dark:border-[rgba(34,197,94,0.35)]"
              >
                <ShieldCheck size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-accent">Bảo vệ Blockchain</p>
                <p className="admin-muted-strong text-xs">Dữ liệu không thể sửa đổi</p>
              </div>
            </div>
            <div className="rounded-lg p-3 bg-slate-100 border border-slate-200 dark:bg-[#1f1f22] dark:border-[#2a2a2d]">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-slate-700 dark:text-[#d4d4d4]">Điểm toàn vẹn dữ liệu</span>
                <span className="text-xs font-bold text-accent">{integrityPct}%</span>
              </div>
              <div className="w-full rounded-full h-1.5 bg-slate-200 dark:bg-[#2a2a2d]">
                <div
                  className="h-1.5 rounded-full transition-all bg-accent"
                  style={{ width: `${integrityPct}%` }}
                />
              </div>
              <p className="text-[11px] mt-1.5 text-slate-500 dark:text-[#737373]">
                {confirmedCount}/{totalEvents} sự kiện đã xác thực
              </p>
            </div>

            {(blockchainRows ?? []).filter((r: any) => r.status === 'confirmed' && r.tx_hash).slice(0, 2).map((r: any) => (
              <a
                key={r.id}
                href={`${process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL ?? 'https://amoy.polygonscan.com'}/tx/${r.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-muted-strong flex items-center gap-1.5 text-[11px] font-mono truncate mt-2 transition-colors hover:underline"
              >
                <ExternalLink size={10} className="flex-shrink-0" />
                {r.tx_hash?.slice(0, 22)}…
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

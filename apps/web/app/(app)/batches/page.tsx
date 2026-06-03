import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { BATCH_STATUS_LABELS } from '@bluefood/shared';
import { formatDateTime, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Eye, QrCode, Pencil, Plus, Home } from 'lucide-react';
import type { BatchStatus, BatchEventType } from '@bluefood/shared';
import { BatchesFilterBar } from '@/components/batches-filter-bar';
import { AutoRefresh } from '@/components/auto-refresh';

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; period?: string; page?: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  draft:             'admin-badge-blue',
  created:           'admin-badge-blue',
  harvested:         'admin-badge-green',
  packed:            'admin-badge-green',
  quality_checked:   'admin-badge-green',
  in_transit:        'admin-badge-purple',
  received_at_store: 'admin-badge-green',
  sold:              'admin-badge-green',
  recalled:          'admin-badge-red',
  cancelled:         'admin-badge-blue',
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

function deriveBatchStatus(status: string | null | undefined, events: any[]) {
  if (status === 'cancelled' || status === 'recalled') return status as BatchStatus;

  let derivedStatus = (status ?? 'created') as BatchStatus;
  let derivedOrder = STATUS_ORDER[derivedStatus] ?? -1;

  for (const event of events) {
    const eventType = event.event_type ?? event.eventType;
    const eventStatus = EVENT_STATUS_UPDATES[eventType as BatchEventType];
    if (!eventStatus || eventStatus === 'recalled') continue;

    const eventOrder = STATUS_ORDER[eventStatus] ?? -1;
    if (eventOrder >= derivedOrder) {
      derivedStatus = eventStatus;
      derivedOrder = eventOrder;
    }
  }

  return derivedStatus;
}

function buildHref(page: number, q?: string, status?: string, period?: string) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (status) sp.set('status', status);
  if (period) sp.set('period', period);
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return `/batches${qs ? '?' + qs : ''}`;
}

function periodToDateRange(period: string): { gte?: string; lt?: string } {
  const now = new Date();
  if (period === 'today') {
    return { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() };
  }
  if (period === '7d') {
    return { gte: new Date(Date.now() - 7 * 86_400_000).toISOString() };
  }
  if (period === '30d') {
    return { gte: new Date(Date.now() - 30 * 86_400_000).toISOString() };
  }
  if (period === '2026') {
    return { gte: '2026-01-01T00:00:00.000Z', lt: '2027-01-01T00:00:00.000Z' };
  }
  return {};
}

export default async function BatchesPage({ searchParams }: PageProps) {
  const { q, status, period, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  const canManageBatches = profile?.role === 'admin';

  const service = createSupabaseServiceClient();

  // ── Cross-table search: resolve product + supplier IDs matching the query ──
  let productIdFilter: string[] = [];
  let supplierIdFilter: string[] = [];
  if (q) {
    const [{ data: matchedProducts }, { data: matchedSuppliers }] = await Promise.all([
      service.from('products').select('id').ilike('name', `%${q}%`),
      service.from('suppliers').select('id').ilike('name', `%${q}%`),
    ]);
    productIdFilter = (matchedProducts ?? []).map((p: any) => p.id);
    supplierIdFilter = (matchedSuppliers ?? []).map((s: any) => s.id);
  }

  // ── Main query ──
  let query = service
    .from('batches')
    .select(
      'id, batch_code, status, quantity, unit, created_at, products(name), suppliers(name), batch_events(event_type, occurred_at)',
      { count: 'exact' }
    );

  if (q) {
    const orParts: string[] = [`batch_code.ilike.%${q}%`];
    if (productIdFilter.length > 0) orParts.push(`product_id.in.(${productIdFilter.join(',')})`);
    if (supplierIdFilter.length > 0) orParts.push(`supplier_id.in.(${supplierIdFilter.join(',')})`);
    query = query.or(orParts.join(','));
  }

  if (period) {
    const { gte, lt } = periodToDateRange(period);
    if (gte) query = query.gte('created_at', gte);
    if (lt)  query = query.lt('created_at', lt);
  }

  const { data: allBatches } = await query
    .order('created_at', { ascending: false })
    .limit(1000);

  const filteredBatches = (allBatches ?? []).filter((batch: any) => {
    if (!status) return true;
    return deriveBatchStatus(batch.status, batch.batch_events ?? []) === status;
  });
  const batches = filteredBatches.slice(offset, offset + PAGE_SIZE);
  const total      = filteredBatches.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fromRow    = total > 0 ? offset + 1 : 0;
  const toRow      = Math.min(offset + PAGE_SIZE, total);
  const hasFilters = !!(q || status || period);

  function getPages(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <AutoRefresh intervalMs={5000} />

      {/* ── Breadcrumb + header ── */}
      <div>
        {/* Breadcrumb */}
        <div className="admin-breadcrumb">
          <Home size={13} />
          <span>/</span>
          <span className="admin-breadcrumb-current">Lô hàng</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="admin-page-title">
              Quản lý Lô hàng
            </h1>
          </div>
          {canManageBatches && (
            <div className="flex items-center gap-3">
              <Link
                href="/batches/new"
                className="admin-primary-button"
              >
                <Plus size={15} />
                Tạo lô mới
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <BatchesFilterBar />

      {/* ── Table card ── */}
      <div className="admin-card">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="admin-table-head-row">
                {['Mã lô', 'Sản phẩm', 'Nhà cung cấp'].map((h) => (
                  <th key={h} className="admin-th">{h}</th>
                ))}
                <th className="admin-th text-right">Khối lượng</th>
                <th className="admin-th text-center">Trạng thái</th>
                <th className="admin-th">Ngày tạo</th>
                <th className="admin-th text-right">Hành động</th>
              </tr>
            </thead>

            <tbody style={{ borderTop: 'none' }}>
              {!batches || batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-muted px-4 py-16 text-center text-sm">
                    {hasFilters ? 'Không tìm thấy lô hàng phù hợp' : 'Chưa có lô hàng nào'}
                  </td>
                </tr>
              ) : (
                batches.map((batch: any) => {
                  const bStatus  = deriveBatchStatus(batch.status, batch.batch_events ?? []);
                  const isRecalled = bStatus === 'recalled';
                  const isSold     = bStatus === 'sold';
                  const badge = STATUS_STYLE[bStatus] ?? STATUS_STYLE.created;

                  return (
                    <tr
                      key={batch.id}
                      className="admin-row group cursor-pointer"
                      onMouseEnter={undefined}
                    >
                      {/* Batch code */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/batches/${batch.batch_code}`}
                          className={`text-sm font-medium hover:underline ${isRecalled ? 'admin-link-danger' : 'admin-link'}`}
                        >
                          {batch.batch_code}
                        </Link>
                      </td>

                      {/* Product */}
                      <td className="admin-ink px-4 py-3 text-sm">
                        {(batch.products as any)?.name ?? '—'}
                      </td>

                      {/* Supplier */}
                      <td className="admin-muted px-4 py-3 text-sm">
                        {(batch.suppliers as any)?.name ?? '—'}
                      </td>

                      {/* Quantity */}
                      <td className="admin-ink px-4 py-3 text-sm text-right font-mono">
                        {formatNumber(batch.quantity)} {batch.unit}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`admin-badge ${badge}`}
                        >
                          {BATCH_STATUS_LABELS[bStatus] ?? bStatus}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="admin-muted px-4 py-3 text-[12px]">
                        {formatDateTime(batch.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/batches/${batch.batch_code}`}
                            className="admin-icon-button p-1.5"
                            title="Xem chi tiết"
                          >
                            <Eye size={17} />
                          </Link>

                          {!isRecalled ? (
                            <Link
                              href={`/trace/${batch.batch_code}`}
                              target="_blank"
                              className="admin-icon-button p-1.5"
                              title="Xem QR / trang trace"
                            >
                              <QrCode size={17} />
                            </Link>
                          ) : (
                            <button disabled className="admin-icon-button p-1.5 opacity-30 cursor-not-allowed">
                              <QrCode size={17} />
                            </button>
                          )}

                          {canManageBatches && !isSold && !isRecalled ? (
                            <Link
                              href={`/batches/${batch.batch_code}`}
                              className="admin-icon-button p-1.5"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={17} />
                            </Link>
                          ) : canManageBatches ? (
                            <button disabled className="admin-icon-button p-1.5 opacity-30 cursor-not-allowed" title="Không thể sửa">
                              <Pencil size={17} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ── */}
        <div className="admin-card-footer px-4 py-3 flex items-center justify-between">
          <span className="admin-muted text-[13px]">
            Hiển thị {fromRow}–{toRow} trong số {total.toLocaleString('vi-VN')} lô hàng
          </span>

          <div className="flex items-center gap-1.5">
            {page > 1 ? (
              <Link
                href={buildHref(page - 1, q, status, period)}
                className="admin-secondary-button !w-8 !h-8 !p-0 !gap-0 text-sm"
              >
                ‹
              </Link>
            ) : (
              <span className="admin-secondary-button !w-8 !h-8 !p-0 !gap-0 text-sm opacity-30 cursor-not-allowed">‹</span>
            )}

            {getPages().map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="admin-muted px-1 text-sm">…</span>
              ) : (
                <Link
                  key={p}
                  href={buildHref(p as number, q, status, period)}
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
              <Link
                href={buildHref(page + 1, q, status, period)}
                className="admin-secondary-button !w-8 !h-8 !p-0 !gap-0 text-sm"
              >
                ›
              </Link>
            ) : (
              <span className="admin-secondary-button !w-8 !h-8 !p-0 !gap-0 text-sm opacity-30 cursor-not-allowed">›</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

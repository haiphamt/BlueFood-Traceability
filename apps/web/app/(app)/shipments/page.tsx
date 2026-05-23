import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { CheckCircle2, Clock, Home } from 'lucide-react';
import { ShipmentsFilterBar } from '@/components/shipments-filter-bar';
import { ShipmentStatusButton } from '@/components/shipment-status-button';
import { getStoreScopeForUser } from '@/lib/shipment-scope';

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string; late?: string; status?: string }>;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeClass: string; dotClass: string;
  pulse: boolean;
}> = {
  in_transit: {
    label: 'Đang vận chuyển',
    badgeClass: 'admin-badge-purple',
    dotClass: 'bg-purple-600 dark:bg-[#ddb7ff]',
    pulse: true,
  },
  planned: {
    label: 'Đang chuẩn bị',
    badgeClass: 'admin-badge-blue',
    dotClass: 'bg-blue-600 dark:bg-[#adc6ff]',
    pulse: false,
  },
  delivered: {
    label: 'Đã giao',
    badgeClass: 'admin-badge-green',
    dotClass: 'bg-emerald-600 dark:bg-[#22c55e]',
    pulse: false,
  },
};

function buildHref(page: number, q?: string, status?: string, late?: string) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (status) sp.set('status', status);
  if (late) sp.set('late', late);
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return `/shipments${qs ? '?' + qs : ''}`;
}

function formatEta(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return {
    hhmm: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    ddmm: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  };
}

export default async function ShipmentsPage({ searchParams }: PageProps) {
  const { q, page: pageStr, late, status } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;
  const now = new Date();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('user_id', user.id).single()
    : { data: null };
  const role = profile?.role ?? 'viewer';

  const service = createSupabaseServiceClient();
  const storeScope = user && role === 'store_staff'
    ? await getStoreScopeForUser(service, user.id)
    : null;

  let batchIdFilter: string[] = [];
  if (q) {
    const { data: matchedProducts } = await supabase
      .from('products')
      .select('id')
      .ilike('name', `%${q}%`);
    const productIds = (matchedProducts ?? []).map((p: any) => p.id);

    let batchQuery = supabase.from('batches').select('id');
    if (productIds.length > 0) {
      batchQuery = batchQuery.or(`batch_code.ilike.%${q}%,product_id.in.(${productIds.join(',')})`);
    } else {
      batchQuery = batchQuery.ilike('batch_code', `%${q}%`);
    }
    const { data: matchedBatches } = await batchQuery;
    batchIdFilter = (matchedBatches ?? []).map((b: any) => b.id);
  }

  let query = supabase
    .from('shipments')
    .select('*, batches(batch_code, products(name))', { count: 'exact' });

  if (q) {
    const orParts: string[] = [`vehicle_code.ilike.%${q}%`];
    if (batchIdFilter.length > 0) orParts.push(`batch_id.in.(${batchIdFilter.join(',')})`);
    query = query.or(orParts.join(','));
  }
  if (role === 'store_staff') {
    if (storeScope?.destinationLocations.length) {
      query = query.in('to_location', storeScope.destinationLocations);
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  }
  if (status) query = query.eq('status', status);
  if (late === '1') query = query.lt('planned_arrival_at', now.toISOString()).neq('status', 'delivered');

  const { data: shipments, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fromRow = total > 0 ? offset + 1 : 0;
  const toRow = Math.min(offset + PAGE_SIZE, total);
  const hasFilters = !!(q || status || late);
  const canDispatch = role === 'admin' || role === 'transporter';
  const canConfirmReceipt = role === 'admin' || (role === 'store_staff' && !!storeScope);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* Breadcrumb + header */}
      <div>
        <div className="admin-breadcrumb">
          <Home size={13} />
          <span>/</span>
          <span className="admin-breadcrumb-current">Vận chuyển</span>
        </div>
        <h1 className="admin-page-title">
          Vận chuyển
        </h1>
      </div>

      {/* Filter bar */}
      <ShipmentsFilterBar />

      {/* Table card */}
      <div className="admin-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="admin-table-head-row">
                <th className="admin-th">Mã lô</th>
                <th className="admin-th">Sản phẩm</th>
                <th className="admin-th">Điểm đi</th>
                <th className="admin-th">Điểm đến</th>
                <th className="admin-th">Trạng thái</th>
                <th className="admin-th">ETA</th>
                <th className="admin-th text-right border-l border-line dark:border-[#2a2a2d]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!shipments || shipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-muted-strong py-16 text-center text-sm">
                    {hasFilters ? 'Không tìm thấy chuyến hàng phù hợp' : 'Chưa có chuyến hàng nào'}
                  </td>
                </tr>
              ) : (
                shipments.map((s: any) => {
                  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.planned;
                  const isDelivered = s.status === 'delivered';
                  const isLate = !isDelivered && s.planned_arrival_at && new Date(s.planned_arrival_at) < now;
                  const eta = formatEta(s.planned_arrival_at);
                  const batchCode = (s.batches as any)?.batch_code ?? '—';
                  const productName = (s.batches as any)?.products?.name ?? '—';

                  return (
                    <tr
                      key={s.id}
                      className={`admin-row group ${isDelivered ? 'opacity-70' : ''}`}
                    >
                      <td className="admin-link py-2.5 px-4 text-sm font-semibold">{batchCode}</td>
                      <td className="py-2.5 px-4 text-sm max-w-[140px]">
                        <span className="admin-ink block truncate">{productName}</span>
                      </td>
                      <td className="py-2.5 px-4 text-sm max-w-[120px]">
                        <span className="admin-muted block truncate">{s.from_location ?? '—'}</span>
                      </td>
                      <td className="py-2.5 px-4 text-sm max-w-[120px]">
                        <span className="admin-muted block truncate">{s.to_location ?? '—'}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`admin-badge gap-1.5 ${cfg.badgeClass}`}
                        >
                          {cfg.pulse ? (
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dotClass}`} />
                          ) : isDelivered ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                          )}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {eta ? (
                          <div>
                            <div className={`text-sm font-semibold ${isLate ? 'text-orange-700 dark:text-[#ffb77a]' : isDelivered ? 'admin-muted-strong' : 'admin-ink'}`}>
                              {eta.hhmm}
                            </div>
                            <div className="admin-muted-strong text-[11px]">{eta.ddmm}</div>
                            {isLate && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 border border-orange-400/30 bg-orange-50 text-orange-700 dark:border-[rgba(255,183,122,0.25)] dark:bg-[rgba(255,183,122,0.12)] dark:text-[#ffb77a]"
                              >
                                <Clock size={9} />
                                Trễ
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="admin-muted-strong text-sm">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right border-l border-line dark:border-[#2a2a2d]">
                        {isDelivered ? (
                          <span
                            className="admin-badge admin-badge-green gap-1 px-2.5 py-1 font-semibold"
                          >
                            <CheckCircle2 size={11} />
                            Đã nhận
                          </span>
                        ) : (
                          <ShipmentStatusButton
                            shipmentId={s.id}
                            status={s.status}
                            canDispatch={canDispatch}
                            canConfirmReceipt={canConfirmReceipt}
                          />
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
        <div className="admin-card-footer px-4 py-3 flex justify-between items-center">
          <span className="admin-muted-strong text-[13px]">
            {fromRow}–{toRow} của {total.toLocaleString('vi-VN')} chuyến hàng
          </span>
          <div className="flex gap-1.5">
            {page > 1 ? (
              <Link
                href={buildHref(page - 1, q, status, late)}
                className="admin-secondary-button !w-8 !h-8 !p-0 !gap-0 text-sm"
              >
                ‹
              </Link>
            ) : (
              <span className="admin-secondary-button !w-8 !h-8 !p-0 !gap-0 text-sm opacity-30 cursor-not-allowed">‹</span>
            )}
            {page < totalPages ? (
              <Link
                href={buildHref(page + 1, q, status, late)}
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

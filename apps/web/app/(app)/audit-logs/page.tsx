import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ShieldCheck, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 30;

interface PageProps {
  searchParams: Promise<{ entityType?: string; page?: string }>;
}

const ENTITY_FILTERS = [
  { value: '',             label: 'Tất cả' },
  { value: 'batches',      label: 'Lô hàng' },
  { value: 'batch_events', label: 'Sự kiện' },
  { value: 'certificates', label: 'Chứng chỉ' },
  { value: 'shipments',    label: 'Vận chuyển' },
];

const ACTION_BADGE: Record<string, string> = {
  insert: 'admin-badge-green',
  update: 'admin-badge-orange',
  delete: 'admin-badge-red',
};

function buildHref(page: number, entityType?: string) {
  const sp = new URLSearchParams();
  if (entityType) sp.set('entityType', entityType);
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return `/audit-logs${qs ? '?' + qs : ''}`;
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const { entityType, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createSupabaseServerClient();

  let query = supabase.from('audit_logs').select('*', { count: 'exact' });
  if (entityType) query = query.eq('entity_type', entityType);

  const { data: logs, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Resolve actor emails from profiles
  const actorIds = Array.from(new Set((logs ?? []).map((l: any) => l.actor_id).filter(Boolean)));
  const { data: profileRows } = actorIds.length > 0
    ? await supabase.from('profiles').select('user_id, email').in('user_id', actorIds)
    : { data: [] };

  const actorMap: Record<string, string> = {};
  for (const p of profileRows ?? []) {
    actorMap[(p as any).user_id] = (p as any).email;
  }

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const fromRow = totalCount > 0 ? offset + 1 : 0;
  const toRow = Math.min(offset + PAGE_SIZE, totalCount);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* ── Security banner ── */}
      <div
        className="border-l-4 border-brand bg-emerald-50 px-5 py-4 rounded-r-xl flex items-start gap-3 dark:border-[#22c55e] dark:bg-[rgba(34,197,94,0.07)]"
      >
        <ShieldCheck size={20} className="mt-0.5 flex-shrink-0 text-brand dark:text-[#22c55e]" />
        <div>
          <p className="admin-ink text-sm font-semibold">Secure Audit Trail</p>
          <p className="admin-muted-strong text-xs mt-0.5">
            Audit log được ghi tự động bởi DB trigger và không thể chỉnh sửa từ ứng dụng.
          </p>
        </div>
      </div>

      {/* ── Header + filter pills ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="admin-page-title">System Audit Logs</h1>
        <div className="flex flex-wrap gap-2">
          {ENTITY_FILTERS.map((f) => {
            const isActive = (entityType ?? '') === f.value;
            return (
              <Link
                key={f.value}
                href={f.value ? `/audit-logs?entityType=${f.value}` : '/audit-logs'}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isActive ? 'bg-accent text-[#003824]' : 'admin-chip'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="admin-card rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="admin-table-head-row">
                {['Thời gian', 'Hành động', 'Đối tượng (Entity)', 'Mô tả', 'Người thực hiện'].map((h) => (
                  <th
                    key={h}
                    className="admin-th"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-muted-strong py-16 text-center text-sm">
                    Chưa có log nào
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => {
                  const badge = ACTION_BADGE[log.action] ?? ACTION_BADGE.update;
                  const isDelete = log.action === 'delete';
                  const email = actorMap[log.actor_id] ?? '—';

                  return (
                    <tr
                      key={log.id}
                      className="admin-row"
                    >
                      {/* Thời gian */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isDelete ? (
                            <AlertTriangle size={14} className="flex-shrink-0 text-red-700 dark:text-[#ffb4ab]" />
                          ) : (
                            <Clock size={14} className="admin-muted-strong flex-shrink-0" />
                          )}
                          <span className="admin-muted text-xs tabular-nums">
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Hành động badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`admin-badge ${badge} font-bold tracking-wide`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-4">
                        <span className="admin-ink text-sm font-semibold">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="admin-muted-strong block text-[11px] font-mono">
                            {log.entity_id.split('-')[0]}
                          </span>
                        )}
                      </td>

                      {/* Mô tả */}
                      <td
                        title={log.summary}
                        className="admin-muted py-3 px-4 text-sm max-w-[280px] truncate"
                      >
                        {isDelete ? <em className="text-red-700 dark:text-[#ffb4ab]">{log.summary}</em> : log.summary}
                      </td>

                      {/* Người thực hiện */}
                      <td className="admin-ink py-3 px-4 text-sm">{email}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ── */}
        <div className="admin-card-footer px-4 py-3 flex items-center justify-between">
          <span className="admin-muted-strong text-sm">
            Hiển thị {fromRow}–{toRow} trên {totalCount.toLocaleString('vi-VN')} dòng
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={buildHref(page - 1, entityType)}
              aria-disabled={page <= 1}
              className={`admin-icon-button p-1.5 ${page <= 1 ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <ChevronLeft size={18} />
            </Link>
            <Link
              href={buildHref(page + 1, entityType)}
              aria-disabled={page >= totalPages}
              className={`admin-icon-button p-1.5 ${page >= totalPages ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

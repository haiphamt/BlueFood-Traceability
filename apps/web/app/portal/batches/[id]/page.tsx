import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SupplierNoteForm } from '@/components/portal/supplier-note-form';
import { canEditPortal, requirePortalContext } from '@/lib/portal';
import { formatDate, formatDateTime } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
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
  return status ? STATUS_LABEL[status] ?? fallbackLabel(status) : '—';
}

function eventLabel(eventType: string | null | undefined) {
  return eventType ? EVENT_TYPE_LABEL[eventType] ?? fallbackLabel(eventType) : 'Cập nhật';
}

export default async function PortalBatchDetailPage({ params }: { params: { id: string } }) {
  const { supabase, supplierIds, portalRole } = await requirePortalContext();
  const { data: batch } = await supabase
    .from('batches')
    .select('*, products(name), certificates(*), batch_events(*)')
    .eq('id', params.id)
    .in('supplier_id', supplierIds)
    .single();

  if (!batch) notFound();
  const product = nestedOne<any>(batch.products);
  const events = [...(batch.batch_events ?? [])].sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-black text-white">{batch.batch_code}</h1>
          <p className="mt-1 text-sm portal-muted">{product?.name} · {statusLabel(batch.status)}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/trace/${batch.batch_code}`} className="portal-button-secondary">Trang QR</Link>
          <a href={`/api/public/trace/${batch.batch_code}/pdf`} className="portal-button-primary">Tải PDF</a>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Khối lượng', `${batch.quantity} ${batch.unit}`],
          ['Thu hoạch', formatDate(batch.harvest_date)],
          ['Hết hạn', formatDate(batch.expiration_date)],
        ].map(([label, value]) => (
          <div key={label} className="portal-card portal-card-pad">
            <p className="text-xs font-bold uppercase tracking-wide portal-muted-strong">{label}</p>
            <p className="mt-2 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <SupplierNoteForm batchId={batch.id} canEdit={canEditPortal(portalRole)} />

      <section className="portal-card portal-card-pad">
        <h2 className="portal-section-title">Timeline</h2>
        <div className="mt-4 space-y-2">
          {events.map((event: any) => (
            <div key={event.id} className="portal-timeline-item">
              <p className="text-sm font-bold text-white">{eventLabel(event.event_type)}</p>
              <p className="mt-0.5 text-xs portal-muted">
                {formatDateTime(event.occurred_at)} {event.location_name ? `· ${event.location_name}` : ''}
              </p>
              {event.note && <p className="mt-1 text-sm portal-muted">{event.note}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

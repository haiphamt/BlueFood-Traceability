import { ClickableTableRow } from '@/components/clickable-table-row';
import { requirePortalContext } from '@/lib/portal';
import { formatDate } from '@/lib/utils';

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

const STATUS_STYLE: Record<string, string> = {
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

function statusBadgeClass(status: string | null | undefined) {
  return status ? STATUS_STYLE[status] ?? 'portal-badge-muted' : 'portal-badge-muted';
}

export default async function PortalBatchesPage() {
  const { supabase, supplierIds } = await requirePortalContext();
  const { data: batches } = await supabase
    .from('batches')
    .select('id, batch_code, status, quantity, unit, harvest_date, expiration_date, products(name)')
    .in('supplier_id', supplierIds)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="portal-page-title">Lô hàng của tôi</h1>
        <p className="mt-1 text-sm portal-muted">Chỉ xem dữ liệu thuộc nhà cung cấp của bạn. Tạo lô hàng do admin/ops thực hiện.</p>
      </div>
      <div className="portal-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="portal-table-head text-left">
              <tr>
                <th className="px-4 py-3">Mã lô</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Khối lượng</th>
                <th className="px-4 py-3">Thu hoạch</th>
                <th className="px-4 py-3">Hết hạn</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(batches ?? []).map((batch: any) => {
                const product = nestedOne<any>(batch.products);
                return (
                  <ClickableTableRow key={batch.id} href={`/portal/batches/${batch.id}`} className="portal-table-row">
                    <td className="px-4 py-3 font-mono font-bold text-white">{batch.batch_code}</td>
                    <td className="px-4 py-3">{product?.name ?? '—'}</td>
                    <td className="px-4 py-3">{batch.quantity} {batch.unit}</td>
                    <td className="px-4 py-3">{formatDate(batch.harvest_date)}</td>
                    <td className="px-4 py-3">{formatDate(batch.expiration_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`portal-badge ${statusBadgeClass(batch.status)}`}>
                        {statusLabel(batch.status)}
                      </span>
                    </td>
                  </ClickableTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

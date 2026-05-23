import { requirePortalContext } from '@/lib/portal';
import { formatDateTime } from '@/lib/utils';

export default async function PortalNotificationsPage() {
  const { supabase, currentSupplier } = await requirePortalContext();
  const { data: notifications } = await supabase
    .from('portal_notifications')
    .select('*')
    .eq('supplier_id', currentSupplier!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-5">
      <h1 className="portal-page-title">Thông báo</h1>
      <div className="portal-card">
        {(notifications ?? []).length === 0 ? (
          <p className="p-6 text-sm portal-muted">Chưa có thông báo.</p>
        ) : (notifications ?? []).map((item: any) => (
          <div key={item.id} className="portal-timeline-item m-3">
            <p className="font-bold text-white">{item.title}</p>
            {item.body && <p className="mt-1 text-sm portal-muted">{item.body}</p>}
            <p className="mt-2 text-xs portal-muted-strong">{formatDateTime(item.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

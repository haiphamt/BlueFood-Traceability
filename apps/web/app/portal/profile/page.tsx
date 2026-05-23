import { ProfileEditor } from '@/components/portal/profile-editor';
import { canEditPortal, requirePortalContext } from '@/lib/portal';

export default async function PortalProfilePage() {
  const { supabase, currentSupplier, portalRole } = await requirePortalContext();
  // currentSupplier is non-null here: the portal layout only renders children when hasMembership === true
  const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', currentSupplier!.id).single();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="portal-page-title">Hồ sơ công ty</h1>
        <p className="mt-1 text-sm portal-muted">Nháp tự lưu mỗi 30 giây. Thay đổi chính thức cần admin duyệt.</p>
      </div>
      <ProfileEditor supplier={supplier ?? currentSupplier} canEdit={canEditPortal(portalRole)} />
    </div>
  );
}

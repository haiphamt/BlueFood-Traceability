import { TeamManager } from '@/components/portal/team-manager';
import { canManageTeam, requirePortalContext } from '@/lib/portal';

export default async function PortalTeamPage() {
  const { supabase, currentSupplier, portalRole } = await requirePortalContext();
  // currentSupplier is non-null here: the portal layout only renders children when hasMembership === true
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from('supplier_users').select('user_id, role, invited_at, accepted_at, profiles(email, full_name)').eq('supplier_id', currentSupplier!.id).order('role'),
    supabase.from('supplier_invites').select('*').eq('supplier_id', currentSupplier!.id).eq('status', 'pending').order('invited_at', { ascending: false }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="portal-page-title">Thành viên</h1>
        <p className="mt-1 text-sm portal-muted">Owner có thể mời tối đa 5 thành viên và thu hồi quyền bất cứ lúc nào.</p>
      </div>
      <TeamManager members={members ?? []} invites={invites ?? []} canManage={canManageTeam(portalRole)} />
    </div>
  );
}

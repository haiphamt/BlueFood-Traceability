import { PortalShell } from '@/components/portal/portal-shell';
import { PortalNoSupplier } from '@/components/portal/portal-no-supplier';
import { requirePortalContext } from '@/lib/portal';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePortalContext();

  console.log('[portal/layout] hasMembership=%s user=%s role=%s supplierName=%s',
    context.hasMembership, context.user.id, context.profile?.role, context.currentSupplier?.name ?? 'none');

  if (!context.hasMembership) {
    return <PortalNoSupplier userEmail={context.user.email} />;
  }

  return (
    <PortalShell
      supplierName={context.currentSupplier!.name}
      supplierLogo={context.currentSupplier!.logo_url}
      userEmail={context.user.email}
    >
      {children}
    </PortalShell>
  );
}

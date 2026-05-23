import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';
import { apiError, ERRORS } from './api-response';

export type SupplierPortalRole = 'owner' | 'manager' | 'member';

export interface PortalSupplier {
  id: string;
  name: string;
  logo_url?: string | null;
  province?: string | null;
  portal_status?: string | null;
}

export interface PortalContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: { id: string; email?: string };
  profile: { role?: string | null; full_name?: string | null } | null;
  memberships: Array<{ supplier_id: string; role: SupplierPortalRole; suppliers: PortalSupplier | PortalSupplier[] | null }>;
  supplierIds: string[];
  currentSupplier: PortalSupplier | null;
  portalRole: SupplierPortalRole | null;
  isAdmin: boolean;
  /** false when the authenticated user has no supplier_users entry yet */
  hasMembership: boolean;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function getPortalContext(): Promise<PortalContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // null means "not authenticated" — the only case that should trigger /login
  if (!user) {
    console.log('[portal] getPortalContext: no user — unauthenticated');
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single();

  const { data: memberships } = await supabase
    .from('supplier_users')
    .select('supplier_id, role, suppliers(id, name, logo_url, province, portal_status)')
    .eq('user_id', user.id)
    .order('invited_at', { ascending: true });

  const rows = (memberships ?? []) as PortalContext['memberships'];
  const first = rows[0];
  const supplier = firstRelation(first?.suppliers);

  console.log('[portal] getPortalContext user=%s role=%s hasMembership=%s', user.id, profile?.role, !!supplier);

  if (!supplier) {
    // Authenticated but no supplier_users entry yet — return stub so the portal
    // can render an empty/setup state instead of redirecting to /login (which
    // would loop back to /portal via middleware).
    return {
      supabase,
      user: { id: user.id, email: user.email ?? undefined },
      profile,
      memberships: [],
      supplierIds: [],
      currentSupplier: null,
      portalRole: null,
      isAdmin: profile?.role === 'admin',
      hasMembership: false,
    };
  }

  return {
    supabase,
    user: { id: user.id, email: user.email ?? undefined },
    profile,
    memberships: rows,
    supplierIds: rows.map((row) => row.supplier_id),
    currentSupplier: supplier,
    portalRole: first.role,
    isAdmin: profile?.role === 'admin',
    hasMembership: true,
  };
}

export async function requirePortalContext() {
  const context = await getPortalContext();

  console.log('[portal] requirePortalContext context=%s', context
    ? `user=${context.user.id} role=${context.profile?.role} hasMembership=${context.hasMembership} isAdmin=${context.isAdmin}`
    : 'null → redirect /login');

  // Only redirect to /login for truly unauthenticated users.
  if (!context) redirect('/login');

  // Non-supplier and non-admin have no business in the portal.
  if (context.profile?.role !== 'supplier' && !context.isAdmin) {
    console.log('[portal] requirePortalContext: wrong role (%s) → redirect /dashboard', context.profile?.role);
    redirect('/dashboard');
  }

  if (context.currentSupplier?.portal_status === 'suspended') {
    console.log('[portal] requirePortalContext: supplier suspended → redirect /login');
    redirect('/login');
  }

  // hasMembership may be false here — callers must handle the empty state.
  return context;
}

export async function requirePortalApiContext() {
  const context = await getPortalContext();
  if (!context) {
    return { error: apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401) };
  }
  if (context.profile?.role !== 'supplier' && !context.isAdmin) {
    return { error: apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403) };
  }
  if (!context.hasMembership) {
    // Supplier authenticated but not yet linked to a supplier profile — no API access.
    return { error: apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403) };
  }
  // hasMembership === true guarantees currentSupplier and portalRole are non-null.
  return {
    context: context as PortalContext & {
      currentSupplier: PortalSupplier;
      portalRole: SupplierPortalRole;
    },
  };
}

export function canEditPortal(role: SupplierPortalRole | null) {
  return role === 'owner' || role === 'manager';
}

export function canManageTeam(role: SupplierPortalRole | null) {
  return role === 'owner';
}

export function statusForCertificate(validUntil?: string | null, reviewStatus?: string | null) {
  if (reviewStatus && reviewStatus !== 'active') return reviewStatus;
  if (!validUntil) return 'active';
  const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'active';
}

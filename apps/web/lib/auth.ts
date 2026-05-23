import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';
import type { UserRole } from '@bluefood/shared';

export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function getProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return data;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();
  const profile = await getProfile();

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    redirect('/dashboard');
  }

  return { session, profile };
}

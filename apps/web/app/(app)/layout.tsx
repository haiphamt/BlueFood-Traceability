import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single();

  // Supplier users have their own portal shell — redirect them out of the admin app.
  if (profile?.role === 'supplier') redirect('/portal');

  return (
    <AppShell userEmail={user.email} userRole={profile?.role}>
      {children}
    </AppShell>
  );
}

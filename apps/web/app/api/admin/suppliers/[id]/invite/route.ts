import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

async function findUserIdByEmail(admin: ReturnType<typeof createSupabaseServiceClient>, email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data.users.find((item: { email?: string; id?: string }) => item.email?.toLowerCase() === email)?.id ?? null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email) return apiError(ERRORS.VALIDATION_ERROR.code, 'Email là bắt buộc', 422);

  const admin = createSupabaseServiceClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/portal/dashboard`;
  let emailSent = false;
  let invitedUserId: string | null = null;
  let inviteError: string | null = null;

  const invite = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'supplier', supplier_id: params.id, supplier_role: 'owner' },
    redirectTo,
  });

  if (invite.error) {
    inviteError = invite.error.message;
    invitedUserId = await findUserIdByEmail(admin, email);
  } else {
    emailSent = true;
    invitedUserId = invite.data.user?.id ?? null;
  }

  let manualLink: string | null = null;
  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      data: { role: 'supplier', supplier_id: params.id, supplier_role: 'owner' },
      redirectTo,
    },
  });
  if (!link.error) {
    manualLink = link.data.properties?.action_link ?? null;
    invitedUserId = invitedUserId ?? link.data.user?.id ?? null;
  }

  if (invitedUserId) {
    await admin.from('profiles').upsert({
      user_id: invitedUserId,
      email,
      full_name: email.split('@')[0],
      role: 'supplier',
      organization_name: null,
    }, { onConflict: 'user_id' });

    await admin.from('supplier_users').upsert({
      user_id: invitedUserId,
      supplier_id: params.id,
      role: 'owner',
      accepted_at: null,
    }, { onConflict: 'user_id,supplier_id' });
  }

  await supabase.from('supplier_invites').upsert({
    supplier_id: params.id,
    email,
    role: 'owner',
    invited_by: user.id,
    status: 'pending',
  }, { onConflict: 'supplier_id,email' });

  return apiOk({ ok: true, emailSent, manualLink, inviteError }, 201);
}

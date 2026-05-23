import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  const body = await request.json().catch(() => ({}));
  const suspended = body.suspended !== false;
  const { error } = await supabase.from('suppliers').update({ portal_status: suspended ? 'suspended' : 'active' }).eq('id', params.id);
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  return apiOk({ ok: true });
}

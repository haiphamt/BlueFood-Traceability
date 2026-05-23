import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json().catch(() => ({}));
  const approved = body.approved !== false;
  const { data: supplier } = await supabase.from('suppliers').select('profile_draft').eq('id', params.id).single();
  if (!supplier) return apiError(ERRORS.NOT_FOUND.code, ERRORS.NOT_FOUND.message, 404);

  const update = approved && supplier.profile_draft ? { ...supplier.profile_draft, profile_draft: null, profile_review_status: 'active' } : { profile_review_status: 'rejected' };
  const { error } = await supabase.from('suppliers').update(update).eq('id', params.id);
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  await supabase.from('portal_notifications').insert({ supplier_id: params.id, audience: 'supplier', type: 'profile_reviewed', title: approved ? 'Hồ sơ công ty đã được duyệt' : 'Hồ sơ công ty bị từ chối' });
  return apiOk({ ok: true });
}

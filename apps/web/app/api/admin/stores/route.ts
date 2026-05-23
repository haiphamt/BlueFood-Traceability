import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiError, ERRORS } from '@/lib/api-response';

export async function GET() {
  // Auth check with session client
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  // Service client bypasses RLS and has full object privileges after the grant migration
  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from('stores')
    .select('id, name, address, province')
    .order('name');

  if (error) {
    console.error('[api/admin/stores] error:', error.message, error.code);
    return NextResponse.json({ stores: [] }, { status: 500 });
  }

  console.log('[api/admin/stores] returning', data?.length ?? 0, 'stores');
  return NextResponse.json({ stores: data ?? [] });
}

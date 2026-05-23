import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { auditLogQuerySchema } from '@bluefood/shared';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'viewer'].includes(profile.role)) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const query = auditLogQuerySchema.parse(rawQuery);

  let dbQuery = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (query.entityType) dbQuery = dbQuery.eq('entity_type', query.entityType);
  if (query.entityId) dbQuery = dbQuery.eq('entity_id', query.entityId);
  if (query.actorId) dbQuery = dbQuery.eq('actor_id', query.actorId);
  if (query.from) dbQuery = dbQuery.gte('created_at', query.from);
  if (query.to) dbQuery = dbQuery.lte('created_at', query.to);

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const { data, count, error } = await dbQuery
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  return apiOk({ items: data ?? [], page: query.page, pageSize: query.pageSize, total: count ?? 0 });
}

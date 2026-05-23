import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { canManageTeam, requirePortalApiContext } from '@/lib/portal';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;
  if (!canManageTeam(context.portalRole)) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const { error } = await context.supabase
    .from('supplier_invites')
    .update({ status: 'cancelled' })
    .eq('supplier_id', context.currentSupplier.id)
    .eq('id', params.id);

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  return apiOk({ ok: true });
}

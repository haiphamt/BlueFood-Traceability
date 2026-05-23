import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { canEditPortal, requirePortalApiContext } from '@/lib/portal';

export async function GET() {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;
  const { data, error } = await context.supabase.from('suppliers').select('*').eq('id', context.currentSupplier.id).single();
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  return apiOk({ item: data });
}

export async function PATCH(request: Request) {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;
  if (!canEditPortal(context.portalRole)) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json();
  const submitForReview = Boolean(body.submitForReview);
  const draft = {
    name: body.name || null,
    description: body.description || null,
    address: body.address || null,
    province: body.province || null,
    phone: body.phone || null,
    contact_email: body.contact_email || null,
    website: body.website || null,
    latitude: body.latitude || null,
    longitude: body.longitude || null,
  };

  const { error } = await context.supabase
    .from('suppliers')
    .update({
      profile_draft: draft,
      profile_review_status: submitForReview ? 'pending_review' : 'active',
    })
    .eq('id', context.currentSupplier.id);

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  if (submitForReview) {
    await context.supabase.from('portal_notifications').insert({
      supplier_id: context.currentSupplier.id,
      audience: 'admin',
      type: 'profile_submitted',
      title: `${context.currentSupplier.name} vừa gửi cập nhật hồ sơ`,
      entity_type: 'supplier',
      entity_id: context.currentSupplier.id,
    });
  }

  return apiOk({ ok: true });
}

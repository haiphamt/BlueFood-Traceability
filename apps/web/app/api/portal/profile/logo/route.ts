import { apiError, apiOk, ERRORS } from '@/lib/api-response';
import { canEditPortal, requirePortalApiContext } from '@/lib/portal';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const result = await requirePortalApiContext();
  if ('error' in result) return result.error;
  const { context } = result;
  if (!canEditPortal(context.portalRole)) return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return apiError(ERRORS.VALIDATION_ERROR.code, 'Logo là bắt buộc', 422);
  if (!['image/png', 'image/jpeg'].includes(file.type)) return apiError(ERRORS.VALIDATION_ERROR.code, 'Logo phải là JPG hoặc PNG', 422);
  if (file.size > MAX_LOGO_BYTES) return apiError(ERRORS.VALIDATION_ERROR.code, 'Logo tối đa 2MB', 422);

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${context.currentSupplier.id}/logo.${ext}`;
  const { error: uploadError } = await context.supabase.storage.from('supplier-logos').upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return apiError(ERRORS.INTERNAL.code, uploadError.message, 500);

  const { data } = context.supabase.storage.from('supplier-logos').getPublicUrl(path);
  await context.supabase.from('suppliers').update({ logo_url: data.publicUrl }).eq('id', context.currentSupplier.id);
  return apiOk({ logoUrl: data.publicUrl });
}

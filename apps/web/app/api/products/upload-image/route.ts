import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'Không có file được gửi lên', 422);
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    return apiError(ERRORS.VALIDATION_ERROR.code, 'File phải nhỏ hơn 5 MB', 422);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return apiError(ERRORS.INTERNAL.code, uploadError.message, 500);

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return apiOk({ url: publicUrl });
}

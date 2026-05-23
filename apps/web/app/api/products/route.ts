import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  return apiOk({ items: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || profile.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const body = await request.json();
  const { name, category, unit, shelf_life_days, image_url } = body;
  if (!name?.trim()) return apiError(ERRORS.VALIDATION_ERROR.code, 'Tên sản phẩm là bắt buộc', 422);
  if (!category?.trim()) return apiError(ERRORS.VALIDATION_ERROR.code, 'Danh mục là bắt buộc', 422);
  if (!unit?.trim()) return apiError(ERRORS.VALIDATION_ERROR.code, 'Đơn vị là bắt buộc', 422);

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      shelf_life_days: shelf_life_days ? Number(shelf_life_days) : null,
      image_url: image_url?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  revalidatePath('/products');
  revalidatePath('/batches/new');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return apiOk({ id: data.id }, 201);
}

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { revalidatePath } from 'next/cache';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error || !data) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy sản phẩm', 404);
  return apiOk(data);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
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

  const { error } = await supabase.from('products')
    .update({
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      shelf_life_days: shelf_life_days ? Number(shelf_life_days) : null,
      image_url: image_url?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  revalidatePath('/products');
  revalidatePath('/batches/new');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return apiOk({ id });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || profile.role !== 'admin') return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);

  const { count } = await supabase.from('batches').select('id', { count: 'exact', head: true }).eq('product_id', id);
  if ((count ?? 0) > 0) return apiError(ERRORS.VALIDATION_ERROR.code, `Không thể xóa — sản phẩm đang có ${count} lô hàng`, 422);

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  revalidatePath('/products');
  revalidatePath('/batches/new');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return apiOk({ deleted: true });
}

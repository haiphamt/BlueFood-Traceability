import { createSupabaseServerClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { revalidatePath } from 'next/cache';

function revalidateSupplierViews() {
  revalidatePath('/suppliers');
  revalidatePath('/batches');
  revalidatePath('/batches/new');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data, error } = await supabase.from('suppliers').select('*').order('name');
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
  const { name, contact_email, phone, address, province, certification_summary } = body;
  if (!name?.trim()) return apiError(ERRORS.VALIDATION_ERROR.code, 'Tên nhà cung cấp là bắt buộc', 422);

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name: name.trim(), contact_email: contact_email || null, phone: phone || null, address: address || null, province: province || null, certification_summary: certification_summary || null })
    .select('id')
    .single();

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);
  revalidateSupplierViews();
  return apiOk({ id: data.id }, 201);
}

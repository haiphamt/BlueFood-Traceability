import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';

const CAN_CREATE_BATCH = new Set(['admin', 'supplier']);

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !CAN_CREATE_BATCH.has(profile.role)) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const service = createSupabaseServiceClient();
  let suppliersQuery = service
    .from('suppliers')
    .select('id, name')
    .order('name');

  if (profile.role === 'supplier') {
    const { data: memberships, error: membershipError } = await service
      .from('supplier_users')
      .select('supplier_id')
      .eq('user_id', user.id);

    if (membershipError) return apiError(ERRORS.INTERNAL.code, membershipError.message, 500);

    const supplierIds = (memberships ?? []).map((row: any) => row.supplier_id);
    suppliersQuery = supplierIds.length
      ? suppliersQuery.in('id', supplierIds)
      : suppliersQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  let batchesQuery = service
    .from('batches')
    .select('id, batch_code, created_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (profile.role === 'supplier') {
    const { data: memberships, error: membershipError } = await service
      .from('supplier_users')
      .select('supplier_id')
      .eq('user_id', user.id);

    if (membershipError) return apiError(ERRORS.INTERNAL.code, membershipError.message, 500);

    const supplierIds = (memberships ?? []).map((row: any) => row.supplier_id);
    batchesQuery = supplierIds.length
      ? batchesQuery.in('supplier_id', supplierIds)
      : batchesQuery.eq('supplier_id', '00000000-0000-0000-0000-000000000000');
  }

  const [suppliersRes, productsRes, batchesRes] = await Promise.all([
    suppliersQuery,
    service.from('products').select('id, name, unit').order('name'),
    batchesQuery,
  ]);

  if (suppliersRes.error) return apiError(ERRORS.INTERNAL.code, suppliersRes.error.message, 500);
  if (productsRes.error) return apiError(ERRORS.INTERNAL.code, productsRes.error.message, 500);
  if (batchesRes.error) return apiError(ERRORS.INTERNAL.code, batchesRes.error.message, 500);

  return apiOk({
    suppliers: suppliersRes.data ?? [],
    products: productsRes.data ?? [],
    batches: (batchesRes.data ?? []).map((batch: any) => ({
      id: batch.id,
      batchCode: batch.batch_code,
      productName: batch.products?.name ?? null,
    })),
  });
}

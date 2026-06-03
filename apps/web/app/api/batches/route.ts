import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { createBatchSchema, batchListQuerySchema } from '@bluefood/shared';
import { generateBatchCode } from '@/lib/batch-code';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const query = batchListQuerySchema.parse(rawQuery);
  const service = createSupabaseServiceClient();

  let dbQuery = service
    .from('batches')
    .select('id, batch_code, status, quantity, unit, created_at, updated_at, products(name), suppliers(name)', { count: 'exact' });

  if (query.q) {
    dbQuery = dbQuery.ilike('batch_code', `%${query.q}%`);
  }
  if (query.status) {
    dbQuery = dbQuery.eq('status', query.status);
  }
  if (query.supplierId) {
    dbQuery = dbQuery.eq('supplier_id', query.supplierId);
  }
  if (query.from) {
    dbQuery = dbQuery.gte('created_at', query.from);
  }
  if (query.to) {
    dbQuery = dbQuery.lte('created_at', query.to);
  }

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const { data, count, error } = await dbQuery
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return apiError(ERRORS.INTERNAL.code, error.message, 500);

  const items = (data ?? []).map((b: any) => ({
    id: b.id,
    batchCode: b.batch_code,
    productName: b.products?.name ?? '—',
    supplierName: b.suppliers?.name ?? '—',
    quantity: b.quantity,
    unit: b.unit,
    status: b.status,
    createdAt: b.created_at,
  }));

  return apiOk({ items, page: query.page, pageSize: query.pageSize, total: count ?? 0 });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(ERRORS.UNAUTHORIZED.code, ERRORS.UNAUTHORIZED.message, 401);

  // Check role
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (!profile || !['admin', 'supplier'].includes(profile.role)) {
    return apiError(ERRORS.FORBIDDEN.code, ERRORS.FORBIDDEN.message, 403);
  }

  const body = await request.json();
  const parsed = createBatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERRORS.VALIDATION_ERROR.code, parsed.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ', 422);
  }

  const input = parsed.data;
  const service = createSupabaseServiceClient();

  if (profile.role === 'supplier') {
    const { data: memberships, error: membershipError } = await service
      .from('supplier_users')
      .select('supplier_id, role')
      .eq('user_id', user.id);

    if (membershipError) return apiError(ERRORS.INTERNAL.code, membershipError.message, 500);

    const allowedSupplierIds = new Set(
      (memberships ?? [])
        .filter((row: any) => ['owner', 'manager'].includes(row.role))
        .map((row: any) => row.supplier_id)
    );
    if (!allowedSupplierIds.has(input.supplierId)) {
      return apiError(
        ERRORS.FORBIDDEN.code,
        'Chỉ owner hoặc manager của nhà cung cấp mới được tạo lô hàng',
        403
      );
    }
  }

  const batchCode = generateBatchCode();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const qrUrl = `${appUrl}/trace/${batchCode}`;

  const { data: batch, error: insertError } = await service
    .from('batches')
    .insert({
      batch_code: batchCode,
      product_id: input.productId,
      supplier_id: input.supplierId,
      quantity: input.quantity,
      unit: input.unit,
      harvest_date: input.harvestDate,
      expiration_date: input.expirationDate,
      origin_location: input.originLocation,
      notes: input.notes,
      image_url: input.imageUrl || null,
      qr_url: qrUrl,
      created_by: user.id,
      status: 'created',
    })
    .select('id')
    .single();

  if (insertError) return apiError(ERRORS.INTERNAL.code, insertError.message, 500);

  // Insert initial created event
  const { data: createdEvent, error: eventError } = await service.from('batch_events').insert({
    batch_id: batch!.id,
    event_type: 'created',
    occurred_at: new Date().toISOString(),
    location_name: input.originLocation,
    note: 'Lô hàng được tạo',
    created_by: user.id,
  }).select('id').single();

  if (eventError) return apiError(ERRORS.INTERNAL.code, eventError.message, 500);

  const { error: auditError } = await service.from('audit_logs').insert([
    {
      entity_type: 'batches',
      entity_id: batch!.id,
      actor_id: user.id,
      action: 'insert',
      summary: `Tạo lô hàng ${batchCode}`,
      new_data: {
        id: batch!.id,
        batch_code: batchCode,
        supplier_id: input.supplierId,
        product_id: input.productId,
        quantity: input.quantity,
        unit: input.unit,
      },
    },
    {
      entity_type: 'batch_events',
      entity_id: batch!.id,
      actor_id: user.id,
      action: 'insert',
      summary: 'Tạo lô hàng được ghi nhận',
      new_data: {
        id: createdEvent!.id,
        batch_id: batch!.id,
        event_type: 'created',
      },
    },
  ]);

  if (auditError) return apiError(ERRORS.INTERNAL.code, auditError.message, 500);

  revalidatePath('/batches');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  revalidatePath('/portal/batches');
  revalidatePath('/portal/dashboard');
  revalidatePath(`/trace/${batchCode}`);

  return apiOk({ batchCode, batchId: batch!.id, traceUrl: qrUrl }, 201);
}

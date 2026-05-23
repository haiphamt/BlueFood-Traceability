import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function csvEscape(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'tat-ca';
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? '';
  const ascending = sort === 'name';
  const sortField = sort === 'name' ? 'name' : 'created_at';

  let query = supabase
    .from('products')
    .select('id, name, category, unit, shelf_life_days, created_at')
    .order(sortField, { ascending });
  if (category) query = query.eq('category', category);

  const { data: products, error } = await query;
  if (error) return new NextResponse('Internal Server Error', { status: 500 });

  const productIds = (products ?? []).map((p: any) => p.id);
  const batchCount: Record<string, number> = {};

  if (productIds.length > 0) {
    const { data: batchRows, error: batchError } = await supabase
      .from('batches')
      .select('product_id')
      .in('product_id', productIds);
    if (batchError) return new NextResponse('Internal Server Error', { status: 500 });

    for (const batch of batchRows ?? []) {
      const productId = (batch as any).product_id;
      batchCount[productId] = (batchCount[productId] ?? 0) + 1;
    }
  }

  const colHeaders = ['Tên sản phẩm', 'Danh mục', 'Đơn vị', 'Hạn sử dụng (ngày)', 'Số lô', 'Ngày tạo'];
  const rows = (products ?? []).map((product: any) => [
    product.name,
    product.category ?? '',
    product.unit ?? '',
    product.shelf_life_days ?? '',
    batchCount[product.id] ?? 0,
    product.created_at ? new Date(product.created_at).toLocaleDateString('vi-VN') : '',
  ]);

  const csvLines = [
    colHeaders.map(csvEscape).join(','),
    ...rows.map(row => row.map(csvEscape).join(',')),
  ];

  const suffix = category ? slugify(category) : 'tat-ca';
  const filename = `du-lieu-san-pham-${suffix}.csv`;

  // U+FEFF BOM makes Excel open UTF-8 CSV with Vietnamese text correctly.
  const csv = '\uFEFF' + csvLines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

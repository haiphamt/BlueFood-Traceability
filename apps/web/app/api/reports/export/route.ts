import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BATCH_STATUS_LABELS } from '@bluefood/shared';

function periodToRange(period?: string | null): { gte?: string; lt?: string } {
  if (period === '7d')   return { gte: new Date(Date.now() - 7 * 86_400_000).toISOString() };
  if (period === '30d')  return { gte: new Date(Date.now() - 30 * 86_400_000).toISOString() };
  if (period === '2026') return { gte: '2026-01-01T00:00:00.000Z', lt: '2027-01-01T00:00:00.000Z' };
  return {};
}

function csvEscape(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
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
  const period = searchParams.get('period') ?? '';
  const { gte, lt } = periodToRange(period);

  let query = supabase
    .from('batches')
    .select('batch_code, status, quantity, unit, created_at, products(name), suppliers(name)')
    .order('created_at', { ascending: false });
  if (gte) query = query.gte('created_at', gte);
  if (lt)  query = query.lt('created_at', lt);

  const { data: batches, error } = await query;
  if (error) return new NextResponse('Internal Server Error', { status: 500 });

  const colHeaders = ['Mã lô', 'Sản phẩm', 'Nhà cung cấp', 'Trạng thái', 'Khối lượng', 'Đơn vị', 'Ngày tạo'];
  const rows = (batches ?? []).map((b: any) => [
    b.batch_code,
    (b.products as any)?.name ?? '',
    (b.suppliers as any)?.name ?? '',
    BATCH_STATUS_LABELS[b.status as keyof typeof BATCH_STATUS_LABELS] ?? b.status,
    b.quantity,
    b.unit,
    new Date(b.created_at).toLocaleDateString('vi-VN'),
  ]);

  const csvLines = [
    colHeaders.map(csvEscape).join(','),
    ...rows.map(row => row.map(csvEscape).join(',')),
  ];

  const periodSlug =
    period === '7d'   ? '7-ngay'  :
    period === '30d'  ? '30-ngay' :
    period === '2026' ? '2026'    : 'tat-ca';
  const filename = `bao-cao-lo-hang-${periodSlug}.csv`;

  // U+FEFF BOM makes Excel open UTF-8 CSV with Vietnamese text correctly
  const csv = '﻿' + csvLines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

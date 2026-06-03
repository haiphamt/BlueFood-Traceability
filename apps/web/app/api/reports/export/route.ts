import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { BATCH_STATUS_LABELS } from '@bluefood/shared';
import type { BatchStatus } from '@bluefood/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { daysBetween, parseReportFilters, shipmentCode, toNumber } from '@/lib/reports';

export const runtime = 'nodejs';

type ColumnDef = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusLabel(status: string | null | undefined) {
  return status ? BATCH_STATUS_LABELS[status as BatchStatus] ?? status : '';
}

function applySheetStyle(worksheet: ExcelJS.Worksheet, columns: ColumnDef[]) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  worksheet.getRow(1).height = 24;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB7D7C2' } },
      left: { style: 'thin', color: { argb: 'FFB7D7C2' } },
      bottom: { style: 'thin', color: { argb: 'FFB7D7C2' } },
      right: { style: 'thin', color: { argb: 'FFB7D7C2' } },
    };
  });

  columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1);
    excelColumn.width = column.width ?? 16;
    if (column.numFmt) excelColumn.numFmt = column.numFmt;
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });
}

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: ColumnDef[], rows: Record<string, unknown>[]) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  worksheet.addRows(rows);
  applySheetStyle(worksheet, columns);
  return worksheet;
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
  const filters = parseReportFilters(searchParams);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];

  const [batchesRes, qrRes, certsRes, shipmentsRes] = await Promise.all([
    (() => {
      let query = supabase
        .from('batches')
        .select('id, batch_code, status, product_id, supplier_id, quantity, unit, harvest_date, expiration_date, origin_location, created_at, updated_at, products(name, category), suppliers(name, province)');
      if (filters.gte) query = query.gte('created_at', filters.gte);
      if (filters.lt) query = query.lt('created_at', filters.lt);
      return query.order('created_at', { ascending: false });
    })(),
    (() => {
      let query = supabase
        .from('qr_scan_logs')
        .select('id, batch_id, batch_code, source, scanned_at')
        .limit(5000);
      if (filters.gte) query = query.gte('scanned_at', filters.gte);
      if (filters.lt) query = query.lt('scanned_at', filters.lt);
      return query.order('scanned_at', { ascending: false });
    })(),
    supabase
      .from('certificates')
      .select('id, certificate_type, certificate_number, issuer, status, issued_at, expires_at, batches(batch_code, suppliers(name))')
      .lte('expires_at', in30Days)
      .gte('expires_at', today)
      .order('expires_at'),
    (() => {
      let query = supabase
        .from('shipments')
        .select('id, status, vehicle_code, transporter_name, planned_departure_at, planned_arrival_at, actual_departure_at, actual_arrival_at, from_location, to_location, batches(batch_code, suppliers(name))')
        .not('planned_arrival_at', 'is', null)
        .limit(5000);
      if (filters.gte) query = query.gte('planned_arrival_at', filters.gte);
      if (filters.lt) query = query.lt('planned_arrival_at', filters.lt);
      return query.order('planned_arrival_at', { ascending: true });
    })(),
  ]);

  if (batchesRes.error || qrRes.error || certsRes.error || shipmentsRes.error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  const batches = batchesRes.data ?? [];
  const qrRows = qrRes.data ?? [];
  const certRows = certsRes.data ?? [];
  const shipmentRows = shipmentsRes.data ?? [];

  const lateShipments = shipmentRows.filter((shipment: any) => {
    const planned = asDate(shipment.planned_arrival_at);
    if (!planned) return false;
    const actual = asDate(shipment.actual_arrival_at);
    if (actual) return actual.getTime() > planned.getTime();
    return planned.getTime() < now.getTime() && shipment.status !== 'delivered';
  });

  const productMap: Record<string, { name: string; count: number; quantity: number }> = {};
  const supplierMap: Record<string, { name: string; count: number; quantity: number }> = {};

  for (const batch of batches) {
    if (batch.product_id) {
      const product = relationOne<any>(batch.products);
      const name = product?.name ?? 'Không rõ';
      if (!productMap[batch.product_id]) productMap[batch.product_id] = { name, count: 0, quantity: 0 };
      productMap[batch.product_id].count++;
      productMap[batch.product_id].quantity += toNumber(batch.quantity);
    }

    if (batch.supplier_id) {
      const supplier = relationOne<any>(batch.suppliers);
      const name = supplier?.name ?? 'Không rõ';
      if (!supplierMap[batch.supplier_id]) supplierMap[batch.supplier_id] = { name, count: 0, quantity: 0 };
      supplierMap[batch.supplier_id].count++;
      supplierMap[batch.supplier_id].quantity += toNumber(batch.quantity);
    }
  }

  const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const topSuppliers = Object.values(supplierMap).sort((a, b) => b.count - a.count).slice(0, 5);

  const qrByBatch = Object.values(
    qrRows.reduce((acc: Record<string, { batchCode: string; scans: number; lastScan?: Date; source?: string }>, scan: any) => {
      const key = scan.batch_code ?? 'Không rõ';
      if (!acc[key]) acc[key] = { batchCode: key, scans: 0, lastScan: undefined, source: scan.source };
      acc[key].scans++;
      const scannedAt = asDate(scan.scanned_at);
      if (scannedAt && (!acc[key].lastScan || scannedAt.getTime() > acc[key].lastScan!.getTime())) {
        acc[key].lastScan = scannedAt;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.scans - a.scans);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlueFood Traceability';
  workbook.subject = 'Báo cáo hệ thống BlueFood';
  workbook.created = new Date();
  workbook.modified = new Date();

  addSheet(workbook, 'Lô hàng', [
    { header: 'Mã lô', key: 'batchCode', width: 18 },
    { header: 'Sản phẩm', key: 'product', width: 28 },
    { header: 'Nhà cung cấp', key: 'supplier', width: 28 },
    { header: 'Trạng thái', key: 'status', width: 18 },
    { header: 'Khối lượng', key: 'quantity', width: 14, numFmt: '#,##0.00' },
    { header: 'Đơn vị', key: 'unit', width: 10 },
    { header: 'Ngày thu hoạch', key: 'harvestDate', width: 18, numFmt: 'dd/mm/yyyy' },
    { header: 'Hạn sử dụng', key: 'expirationDate', width: 18, numFmt: 'dd/mm/yyyy' },
    { header: 'Xuất xứ', key: 'origin', width: 28 },
    { header: 'Ngày tạo', key: 'createdAt', width: 20, numFmt: 'dd/mm/yyyy hh:mm' },
  ], batches.map((batch: any) => ({
    batchCode: batch.batch_code,
    product: relationOne<any>(batch.products)?.name ?? '',
    supplier: relationOne<any>(batch.suppliers)?.name ?? '',
    status: statusLabel(batch.status),
    quantity: toNumber(batch.quantity),
    unit: batch.unit,
    harvestDate: asDate(batch.harvest_date),
    expirationDate: asDate(batch.expiration_date),
    origin: batch.origin_location ?? '',
    createdAt: asDate(batch.created_at),
  })));

  addSheet(workbook, 'Chứng chỉ sắp hết hạn', [
    { header: 'Loại chứng chỉ', key: 'type', width: 24 },
    { header: 'Số chứng chỉ', key: 'number', width: 22 },
    { header: 'Đơn vị cấp', key: 'issuer', width: 30 },
    { header: 'Mã lô', key: 'batchCode', width: 18 },
    { header: 'Nhà cung cấp', key: 'supplier', width: 28 },
    { header: 'Trạng thái', key: 'status', width: 16 },
    { header: 'Ngày cấp', key: 'issuedAt', width: 16, numFmt: 'dd/mm/yyyy' },
    { header: 'Ngày hết hạn', key: 'expiresAt', width: 16, numFmt: 'dd/mm/yyyy' },
    { header: 'Còn ngày', key: 'daysLeft', width: 12 },
  ], certRows.map((cert: any) => ({
    type: cert.certificate_type,
    number: cert.certificate_number ?? '',
    issuer: cert.issuer ?? '',
    batchCode: relationOne<any>(cert.batches)?.batch_code ?? '',
    supplier: relationOne<any>(relationOne<any>(cert.batches)?.suppliers)?.name ?? '',
    status: cert.status ?? '',
    issuedAt: asDate(cert.issued_at),
    expiresAt: asDate(cert.expires_at),
    daysLeft: cert.expires_at ? Math.max(0, Math.ceil((new Date(cert.expires_at).getTime() - now.getTime()) / 86_400_000)) : '',
  })));

  addSheet(workbook, 'Vận chuyển trễ ETA', [
    { header: 'Mã chuyến', key: 'shipmentCode', width: 16 },
    { header: 'Mã lô', key: 'batchCode', width: 18 },
    { header: 'Nhà cung cấp', key: 'supplier', width: 28 },
    { header: 'Trạng thái', key: 'status', width: 16 },
    { header: 'Xe', key: 'vehicle', width: 16 },
    { header: 'Đơn vị vận chuyển', key: 'transporter', width: 26 },
    { header: 'Từ', key: 'from', width: 26 },
    { header: 'Đến', key: 'to', width: 26 },
    { header: 'ETA dự kiến', key: 'plannedArrival', width: 20, numFmt: 'dd/mm/yyyy hh:mm' },
    { header: 'Đến thực tế', key: 'actualArrival', width: 20, numFmt: 'dd/mm/yyyy hh:mm' },
    { header: 'Trễ ngày', key: 'lateDays', width: 12 },
  ], lateShipments.map((shipment: any) => ({
    shipmentCode: shipmentCode(shipment.id),
    batchCode: relationOne<any>(shipment.batches)?.batch_code ?? '',
    supplier: relationOne<any>(relationOne<any>(shipment.batches)?.suppliers)?.name ?? '',
    status: shipment.status ?? '',
    vehicle: shipment.vehicle_code ?? '',
    transporter: shipment.transporter_name ?? '',
    from: shipment.from_location ?? '',
    to: shipment.to_location ?? '',
    plannedArrival: asDate(shipment.planned_arrival_at),
    actualArrival: asDate(shipment.actual_arrival_at),
    lateDays: Math.max(1, daysBetween(shipment.planned_arrival_at, shipment.actual_arrival_at ? new Date(shipment.actual_arrival_at) : now)),
  })));

  addSheet(workbook, 'QR Scans', [
    { header: 'Mã lô', key: 'batchCode', width: 18 },
    { header: 'Số lượt quét', key: 'scans', width: 14 },
    { header: 'Lần quét gần nhất', key: 'lastScan', width: 22, numFmt: 'dd/mm/yyyy hh:mm' },
    { header: 'Nguồn', key: 'source', width: 18 },
  ], qrByBatch.map((item) => ({ ...item, lastScan: item.lastScan ?? null })));

  addSheet(workbook, 'Top thống kê', [
    { header: 'Hạng', key: 'rank', width: 10 },
    { header: 'Top sản phẩm', key: 'productName', width: 30 },
    { header: 'Số lô SP', key: 'productCount', width: 12 },
    { header: 'Tổng KL SP', key: 'productQuantity', width: 16, numFmt: '#,##0.00' },
    { header: 'Top nhà cung cấp', key: 'supplierName', width: 30 },
    { header: 'Số lô NCC', key: 'supplierCount', width: 12 },
    { header: 'Tổng KL NCC', key: 'supplierQuantity', width: 16, numFmt: '#,##0.00' },
  ], Array.from({ length: 5 }, (_, index) => {
    const product = topProducts[index];
    const supplier = topSuppliers[index];
    return {
      rank: index + 1,
      productName: product?.name ?? '',
      productCount: product?.count ?? '',
      productQuantity: product?.quantity ?? '',
      supplierName: supplier?.name ?? '',
      supplierCount: supplier?.count ?? '',
      supplierQuantity: supplier?.quantity ?? '',
    };
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  const suffix = filters.from || filters.to
    ? `${filters.from ?? 'dau-ky'}_${filters.to ?? 'hien-tai'}`
    : filters.period || 'tat-ca';
  const filename = `bao-cao-bluefood-${suffix}.xlsx`;

  return new NextResponse(buffer as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

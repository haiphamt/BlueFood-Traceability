import { apiOk, apiError, ERRORS } from '@/lib/api-response';
import { getPublicTraceData } from '@/lib/trace';

export const dynamic = 'force-dynamic';

function firstRelation<T>(value: T[] | T | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function GET(
  _request: Request,
  { params }: { params: { lotId: string } }
) {
  const { lotId } = params;
  const batch = await getPublicTraceData(lotId);

  if (!batch) return apiError(ERRORS.NOT_FOUND.code, 'Không tìm thấy lô hàng', 404);

  const product = firstRelation(batch.products);
  const supplier = firstRelation(batch.suppliers);
  const timeline = (batch.batch_events ?? [])
    .slice()
    .sort((a, b) => new Date(a.occurred_at ?? 0).getTime() - new Date(b.occurred_at ?? 0).getTime())
    .map((e: any) => ({
      id: e.id,
      eventType: e.event_type,
      occurredAt: e.occurred_at,
      locationName: e.location_name,
      temperatureC: e.temperature_c,
      note: e.note,
      isLate: e.is_late,
      transporterName: e.shipment?.transporter_name ?? null,
    }));

  const response = apiOk({
    batchCode: batch.batch_code,
    productName: product?.name,
    supplierName: supplier?.name,
    originLocation: batch.origin_location,
    quantity: batch.quantity,
    unit: batch.unit,
    status: batch.status,
    harvestDate: batch.harvest_date,
    expirationDate: batch.expiration_date,
    notes: batch.notes,
    certificates: (batch.certificates ?? []).map((c: any) => ({
      type: c.certificate_type,
      certificateType: c.certificate_type,
      issuer: c.issuer,
      certificateNumber: c.certificate_number,
      issuedAt: c.issued_at,
      expiresAt: c.expires_at,
      fileUrl: c.file_url,
    })),
    timeline,
  });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

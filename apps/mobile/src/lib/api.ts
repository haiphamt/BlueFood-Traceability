import { buildApiUrl } from './config';
import { handleNetworkRequestFailed } from './network';

let authToken: string | null = null;
const API_UNREACHABLE_MESSAGE = 'Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i m\u00e1y ch\u1ee7. Vui l\u00f2ng ki\u1ec3m tra m\u1ea1ng r\u1ed3i th\u1eed l\u1ea1i.';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class ApiNetworkError extends Error {
  isNetworkError = true;
  cause?: unknown;

  constructor(cause?: unknown) {
    super(API_UNREACHABLE_MESSAGE);
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function hasAuthToken() {
  return Boolean(authToken);
}

export type BatchCertificate = {
  type?: string | null;
  certificateType?: string | null;
  issuer?: string | null;
  certificateNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  fileUrl?: string | null;
};

export type BatchTimelineEvent = {
  id?: string;
  eventType?: string | null;
  occurredAt?: string | null;
  locationName?: string | null;
  temperatureC?: number | null;
  note?: string | null;
  isLate?: boolean | null;
  transporterName?: string | null;
};

export type BatchSummaryData = {
  batchCode: string;
  productName?: string | null;
  supplierName?: string | null;
  originLocation?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  status?: string | null;
  harvestDate?: string | null;
  expirationDate?: string | null;
  notes?: string | null;
  certificates?: BatchCertificate[];
  timeline?: BatchTimelineEvent[];
};

type InternalBatchDetailResponse = {
  batchCode: string;
  product?: { name?: string | null } | null;
  supplier?: { name?: string | null } | null;
  batch?: {
    quantity?: number | string | null;
    unit?: string | null;
    status?: string | null;
    harvestDate?: string | null;
    expirationDate?: string | null;
    originLocation?: string | null;
    notes?: string | null;
  } | null;
  certificates?: Array<{
    certificate_type?: string | null;
    certificateType?: string | null;
    type?: string | null;
    issuer?: string | null;
    certificate_number?: string | null;
    certificateNumber?: string | null;
    issued_at?: string | null;
    issuedAt?: string | null;
    expires_at?: string | null;
    expiresAt?: string | null;
    file_url?: string | null;
    fileUrl?: string | null;
  }>;
  events?: Array<{
    id?: string;
    event_type?: string | null;
    eventType?: string | null;
    occurred_at?: string | null;
    occurredAt?: string | null;
    location_name?: string | null;
    locationName?: string | null;
    temperature_c?: number | null;
    temperatureC?: number | null;
    note?: string | null;
    is_late?: boolean | null;
    isLate?: boolean | null;
    shipment?: { transporter_name?: string | null } | null;
  }>;
};

function mapInternalBatchSummary(data: InternalBatchDetailResponse): BatchSummaryData {
  return {
    batchCode: data.batchCode,
    productName: data.product?.name,
    supplierName: data.supplier?.name,
    originLocation: data.batch?.originLocation,
    quantity: data.batch?.quantity,
    unit: data.batch?.unit,
    status: data.batch?.status,
    harvestDate: data.batch?.harvestDate,
    expirationDate: data.batch?.expirationDate,
    notes: data.batch?.notes,
    certificates: (data.certificates ?? []).map((cert) => ({
      type: cert.type ?? cert.certificateType ?? cert.certificate_type,
      certificateType: cert.certificateType ?? cert.certificate_type ?? cert.type,
      issuer: cert.issuer,
      certificateNumber: cert.certificateNumber ?? cert.certificate_number,
      issuedAt: cert.issuedAt ?? cert.issued_at,
      expiresAt: cert.expiresAt ?? cert.expires_at,
      fileUrl: cert.fileUrl ?? cert.file_url,
    })),
    timeline: (data.events ?? []).map((event) => ({
      id: event.id,
      eventType: event.eventType ?? event.event_type,
      occurredAt: event.occurredAt ?? event.occurred_at,
      locationName: event.locationName ?? event.location_name,
      temperatureC: event.temperatureC ?? event.temperature_c,
      note: event.note,
      isLate: event.isLate ?? event.is_late,
      transporterName: event.shipment?.transporter_name ?? null,
    })),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(path), { ...options, headers });
  } catch (err) {
    const networkError = new ApiNetworkError(err);
    handleNetworkRequestFailed(networkError);
    throw networkError;
  }
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `HTTP ${res.status}`, res.status, data?.error?.code);
  }

  return data as T;
}

export async function login(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(buildApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    const networkError = new ApiNetworkError(err);
    handleNetworkRequestFailed(networkError);
    throw networkError;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Đăng nhập thất bại');
  return data;
}

export async function getBatchSummary(batchCode: string): Promise<BatchSummaryData> {
  if (authToken) {
    try {
      const internal = await request<InternalBatchDetailResponse>(`/api/batches/${encodeURIComponent(batchCode)}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      return mapInternalBatchSummary(internal);
    } catch (err: any) {
      if (err?.status !== 401 && err?.status !== 403 && err?.status !== 404) {
        throw err;
      }
    }
  }

  return request<BatchSummaryData>(`/api/public/trace/${encodeURIComponent(batchCode)}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
}

export async function syncMutations(mutations: any[]) {
  return request<any>('/api/mobile/sync', {
    method: 'POST',
    body: JSON.stringify({ mutations }),
  });
}

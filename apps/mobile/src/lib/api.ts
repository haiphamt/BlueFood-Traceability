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
  return request<BatchSummaryData>(`/api/public/trace/${batchCode}`, {
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

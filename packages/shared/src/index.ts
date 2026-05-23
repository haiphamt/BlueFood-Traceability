import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type BatchStatus =
  | 'draft'
  | 'created'
  | 'harvested'
  | 'packed'
  | 'quality_checked'
  | 'in_transit'
  | 'received_at_store'
  | 'sold'
  | 'recalled'
  | 'cancelled';

export type UserRole = 'admin' | 'supplier' | 'transporter' | 'store_staff' | 'viewer';

export interface BatchEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  locationName?: string | null;
  temperatureC?: number | null;
  note?: string | null;
  isLate?: boolean;
}

export interface MobileSyncResult {
  clientMutationId: string;
  status: 'synced' | 'duplicate' | 'failed';
  eventId?: string;
  errorMessage?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const BATCH_STATUSES: BatchStatus[] = [
  'draft',
  'created',
  'harvested',
  'packed',
  'quality_checked',
  'in_transit',
  'received_at_store',
  'sold',
  'recalled',
  'cancelled',
];

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft:             'Nháp',
  created:           'Đã tạo',
  harvested:         'Đã thu hoạch',
  packed:            'Đã đóng gói',
  quality_checked:   'Đã kiểm tra CL',
  in_transit:        'Đang vận chuyển',
  received_at_store: 'Đã nhận tại CH',
  sold:              'Đã bán',
  recalled:          'Thu hồi',
  cancelled:         'Đã hủy',
};

export const BATCH_EVENT_TYPES = [
  'created',
  'harvested',
  'packed',
  'quality_checked',
  'pickup',
  'in_transit',
  'delivered',
  'received_at_store',
  'sold',
  'issue_reported',
  'recalled',
  'correction',
] as const;

export type BatchEventType = typeof BATCH_EVENT_TYPES[number];

export const EVENT_TYPE_LABELS: Record<BatchEventType, string> = {
  created:           'Tạo lô hàng',
  harvested:         'Thu hoạch',
  packed:            'Đóng gói',
  quality_checked:   'Kiểm tra chất lượng',
  pickup:            'Lấy hàng',
  in_transit:        'Đang vận chuyển',
  delivered:         'Đã giao hàng',
  received_at_store: 'Nhận tại cửa hàng',
  sold:              'Đã bán',
  issue_reported:    'Báo lỗi',
  recalled:          'Thu hồi',
  correction:        'Chỉnh sửa',
};

// ── Schemas ──────────────────────────────────────────────────────────────────

export const createBatchSchema = z.object({
  productId:        z.string().uuid(),
  supplierId:       z.string().uuid(),
  quantity:         z.number().positive(),
  unit:             z.string().min(1),
  harvestDate:      z.string().optional(),
  expirationDate:   z.string().optional(),
  originLocation:   z.string().optional(),
  notes:            z.string().optional(),
  imageUrl:         z.string().url().optional().or(z.literal('')),
});

export const batchListQuerySchema = z.object({
  q:          z.string().optional(),
  status:     z.string().optional(),
  supplierId: z.string().optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
  page:       z.coerce.number().int().positive().default(1),
  pageSize:   z.coerce.number().int().positive().max(100).default(20),
});

export const createBatchEventSchema = z.object({
  eventType:        z.string().min(1),
  occurredAt:       z.string().optional(),
  locationName:     z.string().optional(),
  temperatureC:     z.number().optional(),
  note:             z.string().optional(),
  clientMutationId: z.string().optional(),
});

export const addCertificateSchema = z.object({
  certificateType:   z.string().min(1),
  issuer:            z.string().min(1),
  certificateNumber: z.string().optional(),
  issuedAt:          z.string(),
  expiresAt:         z.string().optional(),
  fileUrl:           z.string().url().optional(),
});

export const auditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId:   z.string().optional(),
  actorId:    z.string().optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
  page:       z.coerce.number().int().positive().default(1),
  pageSize:   z.coerce.number().int().positive().max(100).default(20),
});

const mobileMutationSchema = z.object({
  clientMutationId: z.string(),
  batchCode:        z.string(),
  eventType:        z.string(),
  occurredAt:       z.string(),
  locationName:     z.string().optional(),
  temperatureC:     z.number().optional(),
  note:             z.string().optional(),
});

export const mobileSyncRequestSchema = z.object({
  mutations: z.array(mobileMutationSchema),
});

export const qrScanLogSchema = z.object({
  source:    z.string().optional(),
  userAgent: z.string().optional(),
});

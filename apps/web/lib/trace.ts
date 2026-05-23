/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared public trace data fetcher.
 * Used by both the /trace/[lotId] page and the /api/public/trace/[lotId]/pdf route
 * so both surfaces always show the same certificates, events, and blockchain data.
 */
import { createClient } from '@supabase/supabase-js';
import type { BatchEventType, BatchStatus } from '@bluefood/shared';

export const LOT_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,49}$/i;

// ─── Shared types ─────────────────────────────────────────────

export type DbBatchEvent = {
  id: string;
  event_type: string;
  occurred_at: string | null;
  location_name: string | null;
  temperature_c?: number | null;
  note: string | null;
  is_late?: boolean | null;
  shipment?: { transporter_name?: string | null } | null;
};

export type DbBlockchain = {
  batch_event_id: string;
  tx_hash: string | null;
  status: 'pending' | 'confirmed' | 'failed' | string;
  block_number: number | null;
};

export type DbCertificate = {
  id: string;
  certificate_type: string;
  issuer: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  status?: string | null;
};

export type TraceData = {
  id: string;
  batch_code: string;
  quantity: number | string | null;
  unit: string | null;
  status: string;
  harvest_date: string | null;
  expiration_date: string | null;
  origin_location: string | null;
  notes: string | null;
  image_url?: string | null;
  products:
    | { name: string; category?: string | null; image_url?: string | null }
    | { name: string; category?: string | null; image_url?: string | null }[]
    | null;
  suppliers:
    | {
        name: string;
        province?: string | null;
        contact_email?: string | null;
        phone?: string | null;
        address?: string | null;
        certification_summary?: string | null;
        website?: string | null;
      }
    | {
        name: string;
        province?: string | null;
        contact_email?: string | null;
        phone?: string | null;
        address?: string | null;
        certification_summary?: string | null;
        website?: string | null;
      }[]
    | null;
  certificates: DbCertificate[] | null;
  batch_events: DbBatchEvent[] | null;
  batch_blockchain: DbBlockchain[] | null;
  is_public?: boolean | null;
};

const STATUS_ORDER: Record<BatchStatus, number> = {
  draft: 0,
  created: 1,
  harvested: 2,
  packed: 3,
  quality_checked: 4,
  in_transit: 5,
  received_at_store: 6,
  sold: 7,
  recalled: 8,
  cancelled: 9,
};

const EVENT_STATUS_UPDATES: Partial<Record<BatchEventType, BatchStatus>> = {
  created: 'created',
  harvested: 'harvested',
  packed: 'packed',
  quality_checked: 'quality_checked',
  pickup: 'in_transit',
  in_transit: 'in_transit',
  delivered: 'received_at_store',
  received_at_store: 'received_at_store',
  sold: 'sold',
  recalled: 'recalled',
};

function deriveBatchStatus(status: string | null | undefined, events: DbBatchEvent[]) {
  if (status === 'cancelled' || status === 'recalled') return status;

  let derivedStatus = status ?? 'created';
  let derivedOrder = STATUS_ORDER[derivedStatus as BatchStatus] ?? -1;

  for (const event of events) {
    const eventStatus = EVENT_STATUS_UPDATES[event.event_type as BatchEventType];
    if (!eventStatus || eventStatus === 'recalled') continue;

    const eventOrder = STATUS_ORDER[eventStatus] ?? -1;
    if (eventOrder >= derivedOrder) {
      derivedStatus = eventStatus;
      derivedOrder = eventOrder;
    }
  }

  return derivedStatus;
}

// ─── Supabase public (anon) client ────────────────────────────

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ─── Shared data fetcher ─────────────────────────────────────
//
// This is the single source of truth for all public trace data,
// including the certificate list. Both the trace page and the PDF
// route MUST call this function so they always show identical data.

export async function getPublicTraceData(lotId: string): Promise<TraceData | null> {
  if (!LOT_ID_PATTERN.test(lotId)) return null;

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('batches')
    .select(`
      id,
      batch_code,
      quantity,
      unit,
      status,
      harvest_date,
      expiration_date,
      origin_location,
      notes,
      image_url,
      products(name, category, image_url),
      suppliers(name, province, contact_email, phone, address, certification_summary, website),
      certificates(id, certificate_type, issuer, certificate_number, issued_at, expires_at, file_url, status),
      batch_events(id, event_type, occurred_at, location_name, temperature_c, note, is_late)
    `)
    .eq('batch_code', lotId)
    .single();

  if (error || !data) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[trace] getPublicTraceData error:', error?.message, '| lotId:', lotId);
    }
    return null;
  }

  // Fetch blockchain records separately — batch_blockchain has no direct FK to batches,
  // so it cannot be embedded in the main query without risking a PostgREST error that
  // would silently null-out all other embedded resources including certificates.
  let blockchain: DbBlockchain[] = [];
  try {
    const eventIds = ((data as any).batch_events ?? []).map((e: any) => e.id as string);
    if (eventIds.length > 0) {
      const { data: bc } = await supabase
        .from('batch_blockchain')
        .select('batch_event_id, tx_hash, block_number, status')
        .in('batch_event_id', eventIds);
      blockchain = (bc ?? []) as DbBlockchain[];
    }
  } catch { /* batch_blockchain table may not exist in all environments */ }

  // Enrich events with optional shipment data
  const rawEvents: any[] = (data as any).batch_events ?? [];
  let eventsWithShipment: DbBatchEvent[] = rawEvents;
  try {
    const shipmentEventTypes = ['pickup', 'in_transit', 'delivered'];
    const hasShipmentEvents = rawEvents.some((e) => shipmentEventTypes.includes(e.event_type));
    if (hasShipmentEvents) {
      const { data: shipments } = await supabase
        .from('shipments')
        .select('id, transporter_name, batch_id')
        .in('batch_id', [(data as any).id]);
      const shipMap = new Map((shipments ?? []).map((s: any) => [s.batch_id, s]));
      eventsWithShipment = rawEvents.map((e) => ({
        ...e,
        shipment: shipMap.get((data as any).id) ?? null,
      }));
    }
  } catch { /* shipments table may not be accessible */ }

  const activeCertificates = ((data as any).certificates ?? []).filter((cert: any) => {
    if (cert.status && cert.status !== 'active') return false;
    if (cert.expires_at && new Date(cert.expires_at) < new Date()) return false;
    return true;
  });

  return {
    ...(data as any),
    status: deriveBatchStatus((data as any).status, eventsWithShipment),
    certificates: activeCertificates,
    batch_events: eventsWithShipment,
    batch_blockchain: blockchain,
  } as TraceData;
}

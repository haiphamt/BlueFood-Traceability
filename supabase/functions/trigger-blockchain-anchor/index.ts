import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface BatchEventRecord {
  id: string;
  batch_id: string;
  event_type: string;
  occurred_at: string;
  note: string | null;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  schema: string;
  record: BatchEventRecord;
  old_record: null;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  const incomingSecret = req.headers.get('x-supabase-webhook-secret');
  if (webhookSecret && incomingSecret !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload: WebhookPayload = await req.json();

  if (payload.type !== 'INSERT' || payload.table !== 'batch_events') {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ev = payload.record;
  const appUrl = Deno.env.get('APP_URL');
  const anchorSecret = Deno.env.get('ANCHOR_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!appUrl || !anchorSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    return new Response('Configuration error', { status: 500 });
  }

  // Fetch batch_code to use as lotId on-chain
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .select('batch_code')
    .eq('id', ev.batch_id)
    .single();

  if (batchErr || !batch) {
    console.error('Failed to fetch batch:', batchErr?.message);
    return new Response('Batch not found', { status: 404 });
  }

  // Canonical payload — must match hash-builder.ts buildHash() exactly
  const canonicalPayload = {
    batchId: ev.batch_id,
    eventType: ev.event_type,
    notes: ev.note ?? null,
    occurredAt: ev.occurred_at,
  };

  const anchorBody = {
    batchEventId: ev.id,
    batchId: ev.batch_id,
    lotId: batch.batch_code,
    eventType: ev.event_type,
    payload: canonicalPayload,
  };

  const res = await fetch(`${appUrl}/api/blockchain/anchor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': anchorSecret,
    },
    body: JSON.stringify(anchorBody),
  });

  const body = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ status: res.status, body }), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
});

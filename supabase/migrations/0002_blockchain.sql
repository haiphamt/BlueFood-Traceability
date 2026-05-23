-- Migration: 0002_blockchain
-- Tracks blockchain anchoring state for each batch event

create table public.batch_blockchain (
  id              uuid primary key default gen_random_uuid(),
  batch_event_id  uuid not null unique references public.batch_events(id) on delete cascade,
  batch_id        uuid not null references public.batches(id) on delete cascade,
  data_hash       text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'failed')),
  tx_hash         text,
  block_number    bigint,
  anchored_at     timestamptz,
  error_message   text,
  retry_count     int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index for fast batch-level queries
create index idx_batch_blockchain_batch_id on public.batch_blockchain (batch_id);
create index idx_batch_blockchain_status   on public.batch_blockchain (status);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_batch_blockchain_updated_at
  before update on public.batch_blockchain
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.batch_blockchain enable row level security;

-- Admins and store staff can read blockchain records
create policy "staff can read blockchain records"
  on public.batch_blockchain
  for select
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
        and role in ('admin', 'store_staff')
    )
  );

-- Public trace view: anyone can read confirmed records (for traceability page)
create policy "public can read confirmed blockchain records"
  on public.batch_blockchain
  for select
  using (status = 'confirmed');

-- Only service role writes (bypasses RLS automatically)

-- Grant access (required after table creation — service_role bypasses RLS but still needs table grants)
grant all on public.batch_blockchain to service_role;
grant all on public.batch_blockchain to authenticated;

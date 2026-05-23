-- BlueFood Traceability initial schema
-- Use this as Supabase migration 0001_initial_schema.sql

create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'admin',
  'supplier',
  'transporter',
  'store_staff',
  'viewer'
);

create type public.batch_status as enum (
  'draft',
  'created',
  'harvested',
  'packed',
  'quality_checked',
  'in_transit',
  'received_at_store',
  'sold',
  'recalled',
  'cancelled'
);

create type public.batch_event_type as enum (
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
  'correction'
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'viewer',
  organization_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  phone text,
  address text,
  province text,
  certification_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit text not null default 'kg',
  shelf_life_days int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  product_id uuid not null references public.products(id),
  supplier_id uuid not null references public.suppliers(id),
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'kg',
  status public.batch_status not null default 'created',
  harvest_date date,
  expiration_date date,
  origin_location text,
  qr_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint batches_expiration_after_harvest check (
    expiration_date is null
    or harvest_date is null
    or expiration_date >= harvest_date
  )
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  certificate_type text not null,
  issuer text,
  certificate_number text,
  issued_at date,
  expires_at date,
  file_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  from_location text not null,
  to_location text not null,
  vehicle_code text,
  transporter_name text,
  planned_departure_at timestamptz,
  planned_arrival_at timestamptz,
  actual_departure_at timestamptz,
  actual_arrival_at timestamptz,
  status text not null default 'planned',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.batch_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  event_type public.batch_event_type not null,
  occurred_at timestamptz not null default now(),
  location_name text,
  temperature_c numeric(5,2),
  note text,
  shipment_id uuid references public.shipments(id),
  certificate_id uuid references public.certificates(id),
  client_mutation_id uuid,
  is_late boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(client_mutation_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.qr_scan_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.batches(id) on delete set null,
  batch_code text not null,
  source text not null default 'public_qr',
  user_agent text,
  ip_hash text,
  scanned_at timestamptz not null default now()
);

create table public.sync_mutations (
  id uuid primary key default gen_random_uuid(),
  client_mutation_id uuid not null unique,
  batch_id uuid references public.batches(id) on delete cascade,
  mutation_type text not null,
  payload jsonb not null,
  result_status text not null default 'received',
  result_event_id uuid references public.batch_events(id),
  error_message text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index idx_batches_status on public.batches(status);
create index idx_batches_supplier_id on public.batches(supplier_id);
create index idx_batches_product_id on public.batches(product_id);
create index idx_batch_events_batch_id_occurred_at on public.batch_events(batch_id, occurred_at);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_qr_scan_logs_batch_code on public.qr_scan_logs(batch_code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_batches_updated_at
before update on public.batches
for each row execute function public.set_updated_at();

create trigger set_shipments_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

create or replace function public.event_type_to_status(event_type public.batch_event_type)
returns public.batch_status
language sql
immutable
as $$
  select case event_type
    when 'created' then 'created'::public.batch_status
    when 'harvested' then 'harvested'::public.batch_status
    when 'packed' then 'packed'::public.batch_status
    when 'quality_checked' then 'quality_checked'::public.batch_status
    when 'pickup' then 'in_transit'::public.batch_status
    when 'in_transit' then 'in_transit'::public.batch_status
    when 'delivered' then 'in_transit'::public.batch_status
    when 'received_at_store' then 'received_at_store'::public.batch_status
    when 'sold' then 'sold'::public.batch_status
    when 'recalled' then 'recalled'::public.batch_status
    else null
  end
$$;

create or replace function public.update_batch_status_from_event()
returns trigger
language plpgsql
security definer
as $$
declare
  next_status public.batch_status;
begin
  next_status := public.event_type_to_status(new.event_type);

  if next_status is not null then
    update public.batches
      set status = next_status
      where id = new.batch_id;
  end if;

  return new;
end;
$$;

create trigger update_batch_status_after_event
after insert on public.batch_events
for each row execute function public.update_batch_status_from_event();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
as $$
declare
  row_id uuid;
  summary_text text;
begin
  if tg_op = 'INSERT' then
    row_id := new.id;
    summary_text := tg_table_name || ' inserted';
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, summary, old_data, new_data)
    values (auth.uid(), lower(tg_op), tg_table_name, row_id, summary_text, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    row_id := new.id;
    summary_text := tg_table_name || ' updated';
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, summary, old_data, new_data)
    values (auth.uid(), lower(tg_op), tg_table_name, row_id, summary_text, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    row_id := old.id;
    summary_text := tg_table_name || ' deleted';
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, summary, old_data, new_data)
    values (auth.uid(), lower(tg_op), tg_table_name, row_id, summary_text, to_jsonb(old), null);
    return old;
  end if;

  return null;
end;
$$;

create trigger audit_batches
after insert or update or delete on public.batches
for each row execute function public.write_audit_log();

create trigger audit_certificates
after insert or update or delete on public.certificates
for each row execute function public.write_audit_log();

create trigger audit_shipments
after insert or update or delete on public.shipments
for each row execute function public.write_audit_log();

create trigger audit_batch_events
after insert on public.batch_events
for each row execute function public.write_audit_log();

create or replace function public.prevent_audit_log_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are append-only';
end;
$$;

create trigger prevent_audit_log_update
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_log_changes();

create or replace function public.prevent_batch_event_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'batch_events are append-only';
end;
$$;

create trigger prevent_batch_event_update
before update or delete on public.batch_events
for each row execute function public.prevent_batch_event_changes();

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.batches enable row level security;
alter table public.certificates enable row level security;
alter table public.shipments enable row level security;
alter table public.batch_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.qr_scan_logs enable row level security;
alter table public.sync_mutations enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select role from public.profiles where user_id = auth.uid()
$$;

-- Demo-friendly RLS. Tighten for production.
create policy "authenticated can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "admin can manage profiles"
on public.profiles for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "authenticated can read suppliers"
on public.suppliers for select
to authenticated
using (true);

create policy "admin supplier can write suppliers"
on public.suppliers for all
to authenticated
using (public.current_user_role() in ('admin', 'supplier'))
with check (public.current_user_role() in ('admin', 'supplier'));

create policy "authenticated can read products"
on public.products for select
to authenticated
using (true);

create policy "admin can write products"
on public.products for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "authenticated can read batches"
on public.batches for select
to authenticated
using (true);

create policy "public can read trace batches"
on public.batches for select
to anon
using (true);

create policy "operators can insert batches"
on public.batches for insert
to authenticated
with check (public.current_user_role() in ('admin', 'supplier'));

create policy "operators can update batches"
on public.batches for update
to authenticated
using (public.current_user_role() in ('admin', 'supplier', 'transporter', 'store_staff'))
with check (public.current_user_role() in ('admin', 'supplier', 'transporter', 'store_staff'));

create policy "authenticated can read certificates"
on public.certificates for select
to authenticated
using (true);

create policy "public can read trace certificates"
on public.certificates for select
to anon
using (true);

create policy "operators can insert certificates"
on public.certificates for insert
to authenticated
with check (public.current_user_role() in ('admin', 'supplier'));

create policy "authenticated can read shipments"
on public.shipments for select
to authenticated
using (true);

create policy "operators can write shipments"
on public.shipments for all
to authenticated
using (public.current_user_role() in ('admin', 'transporter'))
with check (public.current_user_role() in ('admin', 'transporter'));

create policy "authenticated can read batch events"
on public.batch_events for select
to authenticated
using (true);

create policy "public can read trace batch events"
on public.batch_events for select
to anon
using (true);

create policy "operators can insert batch events"
on public.batch_events for insert
to authenticated
with check (public.current_user_role() in ('admin', 'supplier', 'transporter', 'store_staff'));

create policy "authenticated can read audit logs"
on public.audit_logs for select
to authenticated
using (public.current_user_role() in ('admin', 'viewer'));

create policy "public can insert qr scan logs"
on public.qr_scan_logs for insert
to anon, authenticated
with check (true);

create policy "admin can read qr scan logs"
on public.qr_scan_logs for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "operators can insert sync mutations"
on public.sync_mutations for insert
to authenticated
with check (public.current_user_role() in ('admin', 'supplier', 'transporter', 'store_staff'));

create policy "operators can read own sync mutations"
on public.sync_mutations for select
to authenticated
using (created_by = auth.uid() or public.current_user_role() = 'admin');

create policy "service can update sync mutations"
on public.sync_mutations for update
to authenticated
using (public.current_user_role() in ('admin', 'supplier', 'transporter', 'store_staff'))
with check (public.current_user_role() in ('admin', 'supplier', 'transporter', 'store_staff'));

-- Grant table-level access to Supabase roles (required after schema recreation)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;


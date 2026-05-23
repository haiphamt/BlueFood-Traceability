-- Migration: 0003_portal_store_extensions
-- Aligns the restored base schema with the current web/mobile application.

alter type public.batch_status add value if not exists 'received_at_store';
alter type public.batch_status add value if not exists 'sold';

alter type public.batch_event_type add value if not exists 'received_at_store';
alter type public.batch_event_type add value if not exists 'sold';
alter type public.batch_event_type add value if not exists 'issue_reported';

alter table public.suppliers
  add column if not exists description text,
  add column if not exists website text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists logo_url text,
  add column if not exists portal_status text,
  add column if not exists profile_review_status text,
  add column if not exists profile_draft jsonb;

update public.suppliers set portal_status = 'active' where portal_status is null;
update public.suppliers set profile_review_status = 'active' where profile_review_status is null;

alter table public.suppliers
  alter column portal_status set default 'active',
  alter column portal_status set not null,
  alter column profile_review_status set default 'active',
  alter column profile_review_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.suppliers'::regclass
      and conname = 'suppliers_portal_status_check'
  ) then
    alter table public.suppliers
      add constraint suppliers_portal_status_check
      check (portal_status in ('active', 'suspended'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.suppliers'::regclass
      and conname = 'suppliers_profile_review_status_check'
  ) then
    alter table public.suppliers
      add constraint suppliers_profile_review_status_check
      check (profile_review_status in ('active', 'pending_review', 'rejected'));
  end if;
end;
$$;

alter table public.products
  add column if not exists image_url text;

alter table public.batches
  add column if not exists image_url text;

alter table public.certificates
  add column if not exists supplier_id uuid,
  add column if not exists status text,
  add column if not exists storage_path text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

update public.certificates c
set supplier_id = b.supplier_id
from public.batches b
where c.batch_id = b.id
  and c.supplier_id is null;

update public.certificates set status = 'active' where status is null;

alter table public.certificates
  alter column status set default 'active',
  alter column status set not null;

do $$
begin
  if not exists (select 1 from public.certificates where supplier_id is null) then
    alter table public.certificates
      alter column supplier_id set not null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.certificates'::regclass
      and conname = 'certificates_supplier_id_fkey'
  ) then
    alter table public.certificates
      add constraint certificates_supplier_id_fkey
      foreign key (supplier_id) references public.suppliers(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.certificates'::regclass
      and conname = 'certificates_reviewed_by_fkey'
  ) then
    alter table public.certificates
      add constraint certificates_reviewed_by_fkey
      foreign key (reviewed_by) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.certificates'::regclass
      and conname = 'certificates_status_check'
  ) then
    alter table public.certificates
      add constraint certificates_status_check
      check (status in ('active', 'pending_review', 'rejected', 'expiring', 'expired'));
  end if;
end;
$$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  province text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  role text not null default 'member',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, supplier_id)
);

create table if not exists public.store_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  role text not null default 'staff',
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create table if not exists public.supplier_invites (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  manual_link text,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_notifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete cascade,
  audience text not null default 'supplier',
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_supplier_invites_supplier_email
  on public.supplier_invites(supplier_id, email);

create index if not exists idx_supplier_users_supplier_id
  on public.supplier_users(supplier_id);

create index if not exists idx_store_users_store_id
  on public.store_users(store_id);

create index if not exists idx_certificates_supplier_id
  on public.certificates(supplier_id);

create index if not exists idx_certificates_status
  on public.certificates(status);

create index if not exists idx_portal_notifications_supplier_created
  on public.portal_notifications(supplier_id, created_at desc);

drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  )
$$;

create or replace function public.has_supplier_membership(target_supplier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.supplier_users
    where user_id = auth.uid()
      and supplier_id = target_supplier_id
  )
$$;

create or replace function public.can_manage_supplier(target_supplier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.supplier_users
    where user_id = auth.uid()
      and supplier_id = target_supplier_id
      and role in ('owner', 'manager')
  )
$$;

alter table public.stores enable row level security;
alter table public.supplier_users enable row level security;
alter table public.store_users enable row level security;
alter table public.supplier_invites enable row level security;
alter table public.portal_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stores'
      and policyname = 'authenticated can read stores'
  ) then
    create policy "authenticated can read stores"
      on public.stores for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stores'
      and policyname = 'admin can manage stores'
  ) then
    create policy "admin can manage stores"
      on public.stores for all
      to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'supplier_users'
      and policyname = 'supplier members can read supplier users'
  ) then
    create policy "supplier members can read supplier users"
      on public.supplier_users for select
      to authenticated
      using (public.is_admin_user() or public.has_supplier_membership(supplier_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'supplier_users'
      and policyname = 'supplier owners can remove supplier users'
  ) then
    create policy "supplier owners can remove supplier users"
      on public.supplier_users for delete
      to authenticated
      using (public.is_admin_user() or public.can_manage_supplier(supplier_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'supplier_users'
      and policyname = 'admin can manage supplier users'
  ) then
    create policy "admin can manage supplier users"
      on public.supplier_users for all
      to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'store_users'
      and policyname = 'users can read own store assignment'
  ) then
    create policy "users can read own store assignment"
      on public.store_users for select
      to authenticated
      using (public.is_admin_user() or user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'store_users'
      and policyname = 'admin can manage store users'
  ) then
    create policy "admin can manage store users"
      on public.store_users for all
      to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'supplier_invites'
      and policyname = 'supplier managers can read supplier invites'
  ) then
    create policy "supplier managers can read supplier invites"
      on public.supplier_invites for select
      to authenticated
      using (public.is_admin_user() or public.can_manage_supplier(supplier_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'supplier_invites'
      and policyname = 'supplier managers can write supplier invites'
  ) then
    create policy "supplier managers can write supplier invites"
      on public.supplier_invites for all
      to authenticated
      using (public.is_admin_user() or public.can_manage_supplier(supplier_id))
      with check (public.is_admin_user() or public.can_manage_supplier(supplier_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'portal_notifications'
      and policyname = 'portal users can read notifications'
  ) then
    create policy "portal users can read notifications"
      on public.portal_notifications for select
      to authenticated
      using (public.is_admin_user() or supplier_id is null or public.has_supplier_membership(supplier_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'portal_notifications'
      and policyname = 'portal users can insert notifications'
  ) then
    create policy "portal users can insert notifications"
      on public.portal_notifications for insert
      to authenticated
      with check (public.current_user_role() in ('admin', 'supplier'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'certificates'
      and policyname = 'operators can update certificates'
  ) then
    create policy "operators can update certificates"
      on public.certificates for update
      to authenticated
      using (public.current_user_role() in ('admin', 'supplier'))
      with check (public.current_user_role() in ('admin', 'supplier'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'certificates'
      and policyname = 'operators can delete certificates'
  ) then
    create policy "operators can delete certificates"
      on public.certificates for delete
      to authenticated
      using (public.current_user_role() in ('admin', 'supplier'));
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values
      ('product-images', 'product-images', true),
      ('batch-images', 'batch-images', true),
      ('supplier-logos', 'supplier-logos', true),
      ('certificates', 'certificates', false)
    on conflict (id) do update set public = excluded.public;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'public can read BlueFood public images'
    ) then
      execute 'create policy "public can read BlueFood public images"
        on storage.objects for select
        to anon, authenticated
        using (bucket_id in (''product-images'', ''batch-images'', ''supplier-logos''))';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'authenticated can read BlueFood certificate files'
    ) then
      execute 'create policy "authenticated can read BlueFood certificate files"
        on storage.objects for select
        to authenticated
        using (bucket_id = ''certificates'')';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'authenticated can upload BlueFood files'
    ) then
      execute 'create policy "authenticated can upload BlueFood files"
        on storage.objects for insert
        to authenticated
        with check (bucket_id in (''product-images'', ''batch-images'', ''supplier-logos'', ''certificates''))';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'authenticated can update BlueFood files'
    ) then
      execute 'create policy "authenticated can update BlueFood files"
        on storage.objects for update
        to authenticated
        using (bucket_id in (''product-images'', ''batch-images'', ''supplier-logos'', ''certificates''))
        with check (bucket_id in (''product-images'', ''batch-images'', ''supplier-logos'', ''certificates''))';
    end if;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

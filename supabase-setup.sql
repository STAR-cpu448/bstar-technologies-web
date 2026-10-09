-- B-STAR TECHNOLOGIES commerce schema
-- Run in the Supabase SQL Editor. Admins must receive app_metadata.role = 'admin'
-- through a trusted Supabase dashboard/Admin API operation.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  sku text unique check (sku is null or char_length(btrim(sku)) between 1 and 80),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  stock integer not null default 0 check (stock >= 0),
  image_path text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_category_created_idx
  on public.products (category_id, created_at desc)
  where is_active;
create index if not exists categories_active_sort_idx
  on public.categories (sort_order, name)
  where is_active;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
  on public.categories for select
  to anon, authenticated
  using (is_active or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Store admins can manage categories" on public.categories;
create policy "Store admins can manage categories"
  on public.categories for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.categories
      where categories.id = products.category_id
        and categories.is_active
    )
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Store admins can manage products" on public.products;
create policy "Store admins can manage products"
  on public.products for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.dynamic_qr_codes (
  short_code text primary key check (short_code ~ '^[A-Z0-9]{6}$'),
  image_url text not null check (image_url ~ '^https://mwnburzestcooeyyuwow\.supabase\.co/storage/v1/object/public/qr-images/uploads/'),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  price numeric(8, 2) not null default 99 check (price = 99),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.dynamic_qr_codes enable row level security;

revoke all on public.dynamic_qr_codes from anon, authenticated;
grant insert (short_code, image_url, contact_phone, price, status)
  on public.dynamic_qr_codes to anon;
grant select, insert, update, delete on public.dynamic_qr_codes to authenticated;

drop policy if exists "Customers can create pending dynamic QR codes" on public.dynamic_qr_codes;
create policy "Customers can create pending dynamic QR codes"
  on public.dynamic_qr_codes for insert
  to anon
  with check (
    status = 'pending_payment'
    and price = 99
    and expires_at is null
    and short_code ~ '^[A-Z0-9]{6}$'
    and image_url ~ '^https://mwnburzestcooeyyuwow\.supabase\.co/storage/v1/object/public/qr-images/uploads/'
  );

drop policy if exists "Store admins can manage dynamic QR codes" on public.dynamic_qr_codes;
create policy "Store admins can manage dynamic QR codes"
  on public.dynamic_qr_codes for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.dynamic_image_qrs (
  code text primary key check (code ~ '^IMG-[A-Z0-9]{6}$'),
  phone text not null check (phone ~ '^[0-9]{9,15}$'),
  image_url text not null check (image_url ~ '^https://mwnburzestcooeyyuwow\.supabase\.co/storage/v1/object/public/qr-images/uploads/'),
  mpesa_code text check (mpesa_code is null or mpesa_code ~ '^[A-Z0-9]{8,20}$'),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dynamic_image_qrs_mpesa_code_key unique (mpesa_code)
);

create index if not exists dynamic_image_qrs_status_created_idx
  on public.dynamic_image_qrs (status, created_at desc);

alter table public.dynamic_image_qrs enable row level security;
revoke all on public.dynamic_image_qrs from anon, authenticated;
grant insert (code, phone, image_url, mpesa_code) on public.dynamic_image_qrs to anon;
grant select, update on public.dynamic_image_qrs to authenticated;

drop policy if exists "Customers can submit pending dynamic image QRs" on public.dynamic_image_qrs;
create policy "Customers can submit pending dynamic image QRs"
  on public.dynamic_image_qrs for insert
  to anon
  with check (
    status = 'pending_payment'
    and expires_at is null
    and mpesa_code is not null
    and code ~ '^IMG-[A-Z0-9]{6}$'
    and image_url ~ '^https://mwnburzestcooeyyuwow\.supabase\.co/storage/v1/object/public/qr-images/uploads/'
  );

drop policy if exists "Store admins can manage dynamic image QRs" on public.dynamic_image_qrs;
create policy "Store admins can manage dynamic image QRs"
  on public.dynamic_image_qrs for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.get_dynamic_image_qr(p_code text)
returns table (image_url text, status text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select qr.image_url, qr.status, qr.expires_at
  from public.dynamic_image_qrs as qr
  where qr.code = p_code
  limit 1;
$$;

revoke all on function public.get_dynamic_image_qr(text) from public;
grant execute on function public.get_dynamic_image_qr(text) to anon, authenticated;

with legacy_qrs as (
  select
    'IMG-' || old.short_code as code,
    case
      when normalized.phone_digits ~ '^0[0-9]{9}$' then '254' || substr(normalized.phone_digits, 2)
      else normalized.phone_digits
    end as phone,
    old.image_url,
    old.status,
    old.expires_at,
    old.created_at
  from public.dynamic_qr_codes as old
  cross join lateral (
    select regexp_replace(old.contact_phone, '[^0-9]', '', 'g') as phone_digits
  ) as normalized
)
insert into public.dynamic_image_qrs (code, phone, image_url, mpesa_code, status, expires_at, created_at)
select code, phone, image_url, null, status, expires_at, created_at
from legacy_qrs
where phone ~ '^[0-9]{9,15}$'
on conflict (code) do nothing;

create table if not exists public.tool_subscriptions (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^[0-9]{9,15}$'),
  tool_id text not null check (tool_id in (
    'compress-pdf', 'pdf-to-jpg', 'image-to-pdf', 'pdf-merge', 'pdf-split',
    'passport-photo', 'image-compress', 'image-resize', 'format-converter', 'image-crop',
    'whatsapp-link', 'qr-generator', 'age-calculator', 'file-size', 'letter-maker',
    'vat-calculator', 'percentage-calculator', 'invoice-maker', 'mpesa-sheet',
    'cv-checklist', 'business-checklist'
  )),
  mpesa_code text not null check (mpesa_code ~ '^[A-Z0-9]{8,20}$'),
  amount_kes integer not null default 10 check (amount_kes = 10),
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'active', 'rejected')),
  created_at timestamptz not null default now(),
  unique (mpesa_code)
);

create index if not exists tool_subscriptions_lookup_idx
  on public.tool_subscriptions (phone, tool_id, status);
create index if not exists tool_subscriptions_created_idx
  on public.tool_subscriptions (created_at desc);

alter table public.tool_subscriptions enable row level security;
revoke all on public.tool_subscriptions from anon, authenticated;
grant insert (phone, tool_id, mpesa_code, status) on public.tool_subscriptions to anon;
grant select, update on public.tool_subscriptions to authenticated;

drop policy if exists "Customers can submit pending tool payments" on public.tool_subscriptions;
create policy "Customers can submit pending tool payments"
  on public.tool_subscriptions for insert
  to anon
  with check (status = 'pending_approval' and amount_kes = 10);

drop policy if exists "Store admins can manage tool subscriptions" on public.tool_subscriptions;
create policy "Store admins can manage tool subscriptions"
  on public.tool_subscriptions for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.has_active_tool_subscription(p_phone text, p_tool_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tool_subscriptions as subscription
    where subscription.phone = p_phone
      and subscription.tool_id = p_tool_id
      and subscription.status = 'active'
  );
$$;

revoke all on function public.has_active_tool_subscription(text, text) from public;
grant execute on function public.has_active_tool_subscription(text, text) to anon, authenticated;

create or replace function public.get_dynamic_qr_code(p_short_code text)
returns table (image_url text, status text, expires_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select qr.image_url, qr.status, qr.expires_at
  from public.dynamic_qr_codes as qr
  where qr.short_code = p_short_code
  limit 1;
$$;

revoke all on function public.get_dynamic_qr_code(text) from public;
grant execute on function public.get_dynamic_qr_code(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qr-images',
  'qr-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "QR images are publicly readable" on storage.objects;
create policy "QR images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'qr-images');

drop policy if exists "Customers can upload QR images" on storage.objects;
create policy "Customers can upload QR images"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'qr-images'
    and name ~ '^uploads/[A-Za-z0-9][A-Za-z0-9._-]{0,220}$'
    and lower(coalesce(metadata ->> 'mimetype', '')) in ('image/jpeg', 'image/png', 'image/webp')
    and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 5242880
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Store admins can upload product images" on storage.objects;
create policy "Store admins can upload product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Store admins can update product images" on storage.objects;
create policy "Store admins can update product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Store admins can delete product images" on storage.objects;
create policy "Store admins can delete product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

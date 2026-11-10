-- VatFlow schema
-- Multi-tenant: every row scoped to a shop via shop_id, enforced by RLS.

create extension if not exists "pgcrypto";

-- ============================================================
-- SHOPS (tenants)
-- ============================================================
create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,           -- printed on journal header, e.g. "Tadelech"
  business_name text not null,
  tin text,
  vat_rate numeric not null default 0.15 check (vat_rate >= 0 and vat_rate <= 1),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES (users, linked to auth.users) — admins & sellers
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  full_name text not null,
  role text not null default 'seller' check (role in ('admin', 'seller')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- UNITS (admin-manageable units of measure)
-- The XLSX template's Unit of Measure column just wants a plain ID 2-10
-- (2=KG ... 10=PC, 9=OTHER as a catch-all). export_code carries that ID;
-- units outside the template's own list export as 9 (OTHER).
-- ============================================================
create table units (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade, -- null = global default, available to every shop
  label text not null,             -- e.g. "Meter square"
  short_code text not null,        -- e.g. "M2" — shown in pickers and tables
  export_code smallint not null default 9 check (export_code between 2 and 10),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, short_code)
);

-- ============================================================
-- PRODUCTS (admin-managed catalog)
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  unit_price_before_vat numeric not null check (unit_price_before_vat >= 0),
  unit_of_measure uuid not null references units(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Sequence number the shop's physical VAT-registration machine assigned this product.
  -- Backfilled by the admin; not derived from created_at or any in-app ordering.
  machine_code integer,
  unique (shop_id, machine_code)
);

-- ============================================================
-- SALES (one row per VAT receipt)
-- ============================================================
create table sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  seller_id uuid not null references profiles(id),
  client_id text,                     -- client-generated UUID from the offline mobile queue; idempotency key for sync retries
  vat_category text not null default 'G' check (vat_category in ('G', 'S')),
  type_of_sale smallint not null default 1 check (type_of_sale in (1, 2, 3)),
  buyer_tin text,
  buyer_name text,
  sale_date date not null,            -- Gregorian, source of truth; convert to Ethiopian for display/export
  mrc_number text,
  vat_receipt_number text not null,
  created_at timestamptz not null default now(),
  -- Soft void: the receipt number was already handed to a buyer, so a mistake is voided
  -- (kept, excluded from totals/exports) rather than deleted outright.
  voided_at timestamptz,
  voided_reason text,
  voided_by uuid references profiles(id),
  -- Admin review of mobile receipts (migration 0002): set on insert by the
  -- sales_set_review_status trigger, never trusted from the client.
  review_status text not null default 'approved' check (review_status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  unique (shop_id, vat_receipt_number),
  unique (shop_id, client_id)
);

-- ============================================================
-- SALE ITEMS (line items per receipt)
-- ============================================================
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id),
  description text not null,          -- snapshot of product name at time of sale
  unit_of_measure uuid not null references units(id),
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),  -- before VAT
  total_value numeric not null,       -- quantity * unit_price
  vat numeric not null,               -- total_value * vat_rate
  value_after_vat numeric not null    -- total_value + vat
);

-- ============================================================
-- EXPORT TEMPLATE MAPPING (survives Ministry format changes without redeploy)
-- ============================================================
create table export_templates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade, -- null = global default
  name text not null default 'ministry-default',
  columns jsonb not null,             -- ordered [{header, field, format?}]
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table shops enable row level security;
alter table profiles enable row level security;
alter table units enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table export_templates enable row level security;

create function auth_shop_id() returns uuid as $$
  select shop_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create function auth_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create policy "shop members read own shop" on shops
  for select using (id = auth_shop_id());
create policy "admin update own shop" on shops
  for update using (id = auth_shop_id() and auth_role() = 'admin')
  with check (id = auth_shop_id() and auth_role() = 'admin');

create policy "profiles read own shop" on profiles
  for select using (shop_id = auth_shop_id());

create policy "units read own shop or global" on units
  for select using (shop_id = auth_shop_id() or shop_id is null);
create policy "admin manage units" on units
  for all using (shop_id = auth_shop_id() and auth_role() = 'admin')
  with check (shop_id = auth_shop_id() and auth_role() = 'admin');

create policy "products read own shop" on products
  for select using (shop_id = auth_shop_id());
create policy "admin manage products" on products
  for all using (shop_id = auth_shop_id() and auth_role() = 'admin')
  with check (shop_id = auth_shop_id() and auth_role() = 'admin');

create policy "sales read own shop" on sales
  for select using (shop_id = auth_shop_id());
create policy "sellers insert own shop sales" on sales
  for insert with check (shop_id = auth_shop_id() and seller_id = auth.uid());
create policy "admin update/delete sales" on sales
  for update using (shop_id = auth_shop_id() and auth_role() = 'admin');
create policy "admin delete sales" on sales
  for delete using (shop_id = auth_shop_id() and auth_role() = 'admin');

create policy "sale_items follow parent sale" on sale_items
  for select using (
    exists (select 1 from sales s where s.id = sale_id and s.shop_id = auth_shop_id())
  );
create policy "sellers insert sale_items for own sale" on sale_items
  for insert with check (
    exists (select 1 from sales s where s.id = sale_id and s.shop_id = auth_shop_id() and s.seller_id = auth.uid())
  );

create policy "export_templates read own or global" on export_templates
  for select using (shop_id = auth_shop_id() or shop_id is null);
create policy "admin manage export_templates" on export_templates
  for all using (shop_id = auth_shop_id() and auth_role() = 'admin')
  with check (shop_id = auth_shop_id() and auth_role() = 'admin');

-- ============================================================
-- Default units (global, shop_id null) — the template's own 2-10 list.
-- Shops can add their own (e.g. "M2") via the Products page; those always
-- export under export_code 9 (OTHER).
-- ============================================================
insert into units (shop_id, label, short_code, export_code) values
  (null, 'Kilogram', 'KG', 2),
  (null, 'Milliliter', 'ML', 3),
  (null, 'Gram', 'GM', 4),
  (null, 'Liter', 'LIT', 5),
  (null, 'Metric ton', 'MT', 6),
  (null, 'Pieces', 'PCS', 7),
  (null, 'Carton', 'CT', 8),
  (null, 'Other', 'OTHER', 9),
  (null, 'Piece', 'PC', 10);

-- ============================================================
-- Default Ministry export template (matches the current XLSX in use)
-- ============================================================
insert into export_templates (shop_id, name, columns) values (
  null,
  'ministry-default',
  '[
    {"header": "VAT CATEGORY", "field": "vat_category"},
    {"header": "CALENDAR TYPE", "field": "calendar_type"},
    {"header": "Types of Sale", "field": "type_of_sale"},
    {"header": "Buyer TIN", "field": "buyer_tin"},
    {"header": "Buyer name", "field": "buyer_name"},
    {"header": "Date of Sale", "field": "sale_date_ec", "format": "dd/mm/yyyy"},
    {"header": "MRC Number", "field": "mrc_number"},
    {"header": "Vat receipt number", "field": "vat_receipt_number"},
    {"header": "Description", "field": "description"},
    {"header": "Unit of Measure", "field": "unit_label"},
    {"header": "Quantity", "field": "quantity"},
    {"header": "Unit Price", "field": "unit_price"},
    {"header": "Total value", "field": "total_value"},
    {"header": "vat", "field": "vat"},
    {"header": "value after vat", "field": "value_after_vat"}
  ]'::jsonb
);

-- ============================================================
-- Two-step sign-in: admin writes need an aal2 session
-- (supabase/migrations/0001-mfa-admin-writes.sql)
-- ============================================================
create policy "admin writes need two-step sign-in (insert)" on shops as restrictive
  for insert to authenticated with check (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (update)" on shops as restrictive
  for update to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (delete)" on shops as restrictive
  for delete to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');

create policy "admin writes need two-step sign-in (insert)" on units as restrictive
  for insert to authenticated with check (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (update)" on units as restrictive
  for update to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (delete)" on units as restrictive
  for delete to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');

create policy "admin writes need two-step sign-in (insert)" on products as restrictive
  for insert to authenticated with check (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (update)" on products as restrictive
  for update to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (delete)" on products as restrictive
  for delete to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');

create policy "admin writes need two-step sign-in (insert)" on sales as restrictive
  for insert to authenticated with check (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (update)" on sales as restrictive
  for update to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (delete)" on sales as restrictive
  for delete to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');

create policy "admin writes need two-step sign-in (insert)" on sale_items as restrictive
  for insert to authenticated with check (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (update)" on sale_items as restrictive
  for update to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (delete)" on sale_items as restrictive
  for delete to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');

create policy "admin writes need two-step sign-in (insert)" on export_templates as restrictive
  for insert to authenticated with check (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (update)" on export_templates as restrictive
  for update to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin writes need two-step sign-in (delete)" on export_templates as restrictive
  for delete to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');

-- ============================================================
-- Receipt review (supabase/migrations/0002-sale-review.sql)
-- ============================================================
create index sales_shop_review_status_idx on sales (shop_id, review_status);

create function set_sale_review_status() returns trigger as $$
begin
  -- client_id is the mobile offline-queue idempotency key, so it marks a
  -- mobile receipt. Admins' receipts never need review.
  if new.client_id is not null and coalesce(auth_role(), '') <> 'admin' then
    new.review_status := 'pending';
  else
    new.review_status := 'approved';
  end if;
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger sales_set_review_status
  before insert on sales
  for each row execute function set_sale_review_status();

-- A seller fixes a rejected mobile receipt and sends it back for review.
-- One transaction: the lines are replaced and the status reset together,
-- so a failure can't leave a receipt with no lines. VAT is recomputed here
-- from the shop's rate (same rounding as calcLine in src/lib/vat.ts), so a
-- caller can't submit its own totals. The receipt number never changes.
create function resubmit_sale(
  p_sale_id uuid,
  p_buyer_name text,
  p_buyer_tin text,
  p_sale_date date,
  p_items jsonb  -- [{product_id, description, unit_of_measure, quantity, unit_price}]
) returns void as $$
declare
  v_sale sales%rowtype;
  v_rate numeric;
begin
  select * into v_sale from sales where id = p_sale_id for update;
  if not found or v_sale.seller_id <> auth.uid() then
    raise exception 'Receipt not found.';
  end if;
  if v_sale.review_status <> 'rejected' then
    raise exception 'Only receipts sent back for fixing can be resubmitted.';
  end if;
  if v_sale.voided_at is not null then
    raise exception 'This receipt was voided.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i where (i->>'quantity')::numeric <= 0 or (i->>'unit_price')::numeric < 0) then
    raise exception 'Quantities must be greater than 0 and prices can''t be negative.';
  end if;

  select vat_rate into v_rate from shops where id = v_sale.shop_id;

  update sales set
    buyer_name = nullif(trim(p_buyer_name), ''),
    buyer_tin = nullif(trim(p_buyer_tin), ''),
    sale_date = p_sale_date,
    review_status = 'pending',
    review_note = null,
    reviewed_by = null,
    reviewed_at = null
  where id = p_sale_id;

  delete from sale_items where sale_id = p_sale_id;

  insert into sale_items (sale_id, product_id, description, unit_of_measure, quantity, unit_price, total_value, vat, value_after_vat)
  select
    p_sale_id,
    nullif(i->>'product_id', '')::uuid,
    i->>'description',
    (i->>'unit_of_measure')::uuid,
    q.qty,
    q.price,
    round(q.qty * q.price, 2),
    round(round(q.qty * q.price, 2) * v_rate, 2),
    round(q.qty * q.price, 2) + round(round(q.qty * q.price, 2) * v_rate, 2)
  from jsonb_array_elements(p_items) i
  cross join lateral (select (i->>'quantity')::numeric as qty, (i->>'unit_price')::numeric as price) q;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function resubmit_sale(uuid, text, text, date, jsonb) from public, anon;
grant execute on function resubmit_sale(uuid, text, text, date, jsonb) to authenticated;

-- ============================================================
-- Security hardening (supabase/migrations/0003-security-hardening.sql)
-- ============================================================

-- 5 -------------------------------------------------------------------------
alter function auth_shop_id() set search_path = public;
alter function auth_role() set search_path = public;

-- 1, 2 ----------------------------------------------------------------------
create function create_sale(
  p_client_id text,          -- mobile offline-queue key; null from the web form
  p_vat_category text,
  p_type_of_sale smallint,
  p_buyer_tin text,
  p_buyer_name text,
  p_sale_date date,
  p_mrc_number text,
  p_vat_receipt_number text,
  p_items jsonb              -- [{product_id, description, unit_of_measure, quantity, unit_price}]
) returns uuid as $$
declare
  v_profile profiles%rowtype;
  v_rate numeric;
  v_sale_id uuid;
begin
  select * into v_profile from profiles where id = auth.uid();
  if not found then
    raise exception 'Not signed in.';
  end if;
  if v_profile.role = 'admin' and coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Two-step sign-in required.';
  end if;
  if coalesce(trim(p_vat_receipt_number), '') = '' then
    raise exception 'Receipt number is required.';
  end if;
  if p_sale_date is null or p_sale_date > (now() at time zone 'Africa/Addis_Ababa')::date + 1 then
    raise exception 'Sale date can''t be in the future.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'A receipt needs between 1 and 100 items.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where not ((i->>'quantity')::numeric > 0 and (i->>'quantity')::numeric < 1e9)
       or not ((i->>'unit_price')::numeric >= 0 and (i->>'unit_price')::numeric < 1e12)
       or coalesce(trim(i->>'description'), '') = ''
  ) then
    raise exception 'Each item needs a description, a quantity greater than 0 and a valid price.';
  end if;
  -- Products and units must belong to this shop (units may also be global).
  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where (nullif(i->>'product_id', '') is not null and not exists (
             select 1 from products p where p.id = (i->>'product_id')::uuid and p.shop_id = v_profile.shop_id))
       or not exists (
             select 1 from units u where u.id = (i->>'unit_of_measure')::uuid
               and (u.shop_id = v_profile.shop_id or u.shop_id is null))
  ) then
    raise exception 'Unknown product or unit.';
  end if;

  select vat_rate into v_rate from shops where id = v_profile.shop_id;

  -- review_status is set by the sales_set_review_status trigger.
  insert into sales (shop_id, seller_id, client_id, vat_category, type_of_sale,
                     buyer_tin, buyer_name, sale_date, mrc_number, vat_receipt_number)
  values (v_profile.shop_id, v_profile.id, nullif(p_client_id, ''),
          coalesce(p_vat_category, 'G'), coalesce(p_type_of_sale, 1),
          nullif(trim(p_buyer_tin), ''), nullif(trim(p_buyer_name), ''), p_sale_date,
          nullif(trim(p_mrc_number), ''), trim(p_vat_receipt_number))
  returning id into v_sale_id;

  -- Same rounding as calcLine in src/lib/vat.ts.
  insert into sale_items (sale_id, product_id, description, unit_of_measure, quantity, unit_price, total_value, vat, value_after_vat)
  select
    v_sale_id,
    nullif(i->>'product_id', '')::uuid,
    trim(i->>'description'),
    (i->>'unit_of_measure')::uuid,
    q.qty,
    q.price,
    round(q.qty * q.price, 2),
    round(round(q.qty * q.price, 2) * v_rate, 2),
    round(q.qty * q.price, 2) + round(round(q.qty * q.price, 2) * v_rate, 2)
  from jsonb_array_elements(p_items) i
  cross join lateral (select (i->>'quantity')::numeric as qty, (i->>'unit_price')::numeric as price) q;

  return v_sale_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function create_sale(text, text, smallint, text, text, date, text, text, jsonb) from public, anon;
grant execute on function create_sale(text, text, smallint, text, text, date, text, text, jsonb) to authenticated;

drop policy "sellers insert own shop sales" on sales;
drop policy "sellers insert sale_items for own sale" on sale_items;

-- resubmit_sale: same NaN-proof bounds, item cap, and shop check on products/units.
create or replace function resubmit_sale(
  p_sale_id uuid,
  p_buyer_name text,
  p_buyer_tin text,
  p_sale_date date,
  p_items jsonb  -- [{product_id, description, unit_of_measure, quantity, unit_price}]
) returns void as $$
declare
  v_sale sales%rowtype;
  v_rate numeric;
begin
  select * into v_sale from sales where id = p_sale_id for update;
  if not found or v_sale.seller_id <> auth.uid() then
    raise exception 'Receipt not found.';
  end if;
  if v_sale.review_status <> 'rejected' then
    raise exception 'Only receipts sent back for fixing can be resubmitted.';
  end if;
  if v_sale.voided_at is not null then
    raise exception 'This receipt was voided.';
  end if;
  if p_sale_date is null or p_sale_date > (now() at time zone 'Africa/Addis_Ababa')::date + 1 then
    raise exception 'Sale date can''t be in the future.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'A receipt needs between 1 and 100 items.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where not ((i->>'quantity')::numeric > 0 and (i->>'quantity')::numeric < 1e9)
       or not ((i->>'unit_price')::numeric >= 0 and (i->>'unit_price')::numeric < 1e12)
  ) then
    raise exception 'Quantities must be greater than 0 and prices can''t be negative.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where (nullif(i->>'product_id', '') is not null and not exists (
             select 1 from products p where p.id = (i->>'product_id')::uuid and p.shop_id = v_sale.shop_id))
       or not exists (
             select 1 from units u where u.id = (i->>'unit_of_measure')::uuid
               and (u.shop_id = v_sale.shop_id or u.shop_id is null))
  ) then
    raise exception 'Unknown product or unit.';
  end if;

  select vat_rate into v_rate from shops where id = v_sale.shop_id;

  update sales set
    buyer_name = nullif(trim(p_buyer_name), ''),
    buyer_tin = nullif(trim(p_buyer_tin), ''),
    sale_date = p_sale_date,
    review_status = 'pending',
    review_note = null,
    reviewed_by = null,
    reviewed_at = null
  where id = p_sale_id;

  delete from sale_items where sale_id = p_sale_id;

  insert into sale_items (sale_id, product_id, description, unit_of_measure, quantity, unit_price, total_value, vat, value_after_vat)
  select
    p_sale_id,
    nullif(i->>'product_id', '')::uuid,
    i->>'description',
    (i->>'unit_of_measure')::uuid,
    q.qty,
    q.price,
    round(q.qty * q.price, 2),
    round(round(q.qty * q.price, 2) * v_rate, 2),
    round(q.qty * q.price, 2) + round(round(q.qty * q.price, 2) * v_rate, 2)
  from jsonb_array_elements(p_items) i
  cross join lateral (select (i->>'quantity')::numeric as qty, (i->>'unit_price')::numeric as price) q;
end;
$$ language plpgsql security definer set search_path = public;

-- 3 -------------------------------------------------------------------------
drop policy "sales read own shop" on sales;
create policy "sales read: admins whole shop, sellers own" on sales
  for select using (shop_id = auth_shop_id() and (auth_role() = 'admin' or seller_id = auth.uid()));

drop policy "sale_items follow parent sale" on sale_items;
create policy "sale_items follow parent sale" on sale_items
  for select using (
    exists (select 1 from sales s where s.id = sale_id and s.shop_id = auth_shop_id()
            and (auth_role() = 'admin' or s.seller_id = auth.uid()))
  );

-- 4 -------------------------------------------------------------------------
create policy "admin reads need two-step sign-in" on sales as restrictive
  for select to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');
create policy "admin reads need two-step sign-in" on sale_items as restrictive
  for select to authenticated using (auth_role() is distinct from 'admin' or (auth.jwt() ->> 'aal') = 'aal2');


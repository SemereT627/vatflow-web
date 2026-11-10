-- Security hardening (Nov 2026 review).
--
-- 1. Receipts are only created through create_sale(): it checks the caller's
--    shop, the products/units, and the numbers, computes VAT from the shop's
--    rate, and writes the receipt and its lines in one transaction. Sellers
--    lose direct INSERT on sales/sale_items, so a password-only session can
--    no longer write its own VAT totals, skip review (client_id null) or set
--    voided/category fields through PostgREST.
-- 2. NaN/Infinity can't slip through: checks use upper bounds (NaN and
--    Infinity compare greater than every number in Postgres).
-- 3. Sellers read only their own receipts; admins read the whole shop.
-- 4. Admins need two-step sign-in (aal2) to read receipts, not just write.
-- 5. auth_shop_id()/auth_role() get a pinned search_path.
-- Run in the Supabase SQL editor, then deploy the web app that calls create_sale.

begin;

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

commit;

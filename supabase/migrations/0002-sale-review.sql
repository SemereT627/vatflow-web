-- Admin review of receipts recorded on VatFlow Mobile. A seller's mobile
-- receipt starts 'pending'; an admin approves it, or rejects it with a note
-- the seller sees in the app, fixes and resubmits (back to 'pending').
-- Receipts recorded on the web, and anything an admin records, are approved
-- on insert. Review is verification, not a gate: pending and rejected
-- receipts still count in totals and the Ministry export, because the
-- receipt was already issued to the buyer.
--
-- The status is set by a trigger, not trusted from the client: the mobile
-- app inserts as the seller (RLS), so it could otherwise send 'approved'.
-- Existing rows default to 'approved'. Run manually in the Supabase SQL
-- editor.

begin;

alter table sales
  add column review_status text not null default 'approved'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column review_note text,
  add column reviewed_by uuid references profiles(id),
  add column reviewed_at timestamptz;

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

commit;

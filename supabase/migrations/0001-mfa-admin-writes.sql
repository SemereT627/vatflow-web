-- Two-step sign-in (TOTP). The proxy and getCurrentProfile() already
-- require an aal2 session on the web; this enforces it in the database too,
-- so an admin's password alone (an aal1 session) can't change data even by
-- calling PostgREST directly with the public anon key.
--
-- Scoped to admins: the mobile app writes sales as the seller (Bearer token,
-- RLS applies) and has no two-step sign-in yet, so seller writes stay
-- allowed at aal1. RESTRICTIVE, so these are ANDed with the existing
-- shop-scoped policies. Run manually in the Supabase SQL editor.

begin;

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

commit;

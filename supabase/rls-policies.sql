-- KumBola — owner-scoped RLS SELECT policies (defense in depth).
-- The server API uses the service role (bypasses RLS). These policies let real
-- authenticated users read their own rows over REST, while anon and cross-user
-- access stays denied. dumping_reports intentionally has NO policy: city/admin
-- access goes through the service-role API only.
-- Idempotent: safe to run repeatedly (apply via supabase/apply-rls.ts).

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "bookings party read" on public.bookings;
create policy "bookings party read" on public.bookings
  for select to authenticated
  using (auth.uid() = customer_id or auth.uid() = driver_id);

drop policy if exists "verifications party read" on public.disposal_verifications;
create policy "verifications party read" on public.disposal_verifications
  for select to authenticated
  using (
    driver_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.id = disposal_verifications.booking_id
        and (b.customer_id = auth.uid() or b.driver_id = auth.uid())
    )
  );

drop policy if exists "transactions owner read" on public.transactions;
create policy "transactions owner read" on public.transactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "notifications owner read" on public.notifications;
create policy "notifications owner read" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

-- payment_intents already has "payment_intents owner read" in schema.sql.
-- plans / disposal_sites already have public-read policies in schema.sql.

-- ============================================================
-- KumBola — Supabase schema
-- Three-sided platform: customers, Aboboyaa drivers, city/admin
-- All app access flows through server API routes (service role).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PLANS (stable text ids) ----------
create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text,
  price_ghs numeric(10,2) not null,
  pickups_per_month numeric(5,1) not null,
  target text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ---------- DISPOSAL SITES (stable text ids) ----------
create table if not exists public.disposal_sites (
  id text primary key,
  name text not null,
  type text not null check (type in ('landfill','transfer_station','recycling','aggregation')),
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  geofence_radius_m int not null default 200,
  municipality text,
  is_active boolean not null default true
);

-- ---------- PROFILES (extends auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','driver','admin')),
  full_name text not null default '',
  phone text,
  email text,
  avatar_url text,
  -- customer fields
  account_type text check (account_type in ('household','business','institution')),
  plan_id text references public.plans(id),
  plan_credits int not null default 0,
  municipality text,
  address text,
  wallet_balance numeric(12,2) not null default 0,
  -- driver fields
  vehicle_plate text,
  vehicle_type text default 'Aboboyaa 200cc',
  base_municipality text,
  rating numeric(3,2) not null default 5.00,
  rating_count int not null default 0,
  total_jobs int not null default 0,
  total_earnings numeric(12,2) not null default 0,
  is_online boolean not null default false,
  license_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- BOOKINGS ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  customer_id uuid not null references public.profiles(id),
  driver_id uuid references public.profiles(id),
  booking_type text not null default 'one_off' check (booking_type in ('one_off','plan')),
  plan_id text references public.plans(id),
  waste_size text not null default 'standard_bin' check (waste_size in ('small_sack','standard_bin','bulky')),
  waste_kind text not null default 'general' check (waste_kind in ('general','recyclables','business','institutional')),
  estimated_kg numeric(8,1) not null default 40,
  municipality text not null,
  address text not null,
  pickup_code text not null,
  preferred_time text not null default 'now',
  notes text,
  amount_ghs numeric(10,2) not null default 0,
  driver_payout_ghs numeric(10,2) not null default 0,
  commission_ghs numeric(10,2) not null default 0,
  used_credit boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','assigned','collected','verified','cancelled')),
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  collected_at timestamptz,
  verified_at timestamptz,
  cancelled_at timestamptz
);

-- ---------- DISPOSAL VERIFICATIONS (proof of disposal) ----------
create table if not exists public.disposal_verifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  driver_id uuid not null references public.profiles(id),
  site_id text not null references public.disposal_sites(id),
  weight_kg numeric(8,1) not null default 0,
  recyclables_kg numeric(8,1) not null default 0,
  lat numeric(9,6),
  lng numeric(9,6),
  distance_m numeric(8,1),
  within_geofence boolean not null default false,
  photo_url text,
  site_ticket text,
  method text not null default 'gps+photo+ticket',
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ---------- TRANSACTIONS (MoMo wallet ledger) ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  booking_id uuid references public.bookings(id),
  type text not null check (type in ('payment','payout','bonus','topup','subscription','commission')),
  amount_ghs numeric(10,2) not null,
  method text not null default 'momo',
  network text,
  reference text,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'info' check (kind in ('info','success','warning','error')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- ILLEGAL DUMPING REPORTS (city data) ----------
create table if not exists public.dumping_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_name text,
  municipality text not null,
  location_text text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  lat numeric(9,6),
  lng numeric(9,6),
  created_at timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index if not exists idx_bookings_customer on public.bookings(customer_id, created_at desc);
create index if not exists idx_bookings_driver on public.bookings(driver_id, created_at desc);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_municipality on public.bookings(municipality);
create index if not exists idx_txn_user on public.transactions(user_id, created_at desc);
create index if not exists idx_notif_user on public.notifications(user_id, created_at desc);
create index if not exists idx_verif_booking on public.disposal_verifications(booking_id);

-- ---------- ROW LEVEL SECURITY ----------
-- Server API uses the service role (bypasses RLS). Enable RLS everywhere so
-- direct anon/authenticated access is locked down by default.
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.disposal_verifications enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.dumping_reports enable row level security;

-- Plans and sites are public marketing/operational reference data.
alter table public.plans enable row level security;
alter table public.disposal_sites enable row level security;
drop policy if exists "plans public read" on public.plans;
create policy "plans public read" on public.plans for select using (true);
drop policy if exists "sites public read" on public.disposal_sites;
create policy "sites public read" on public.disposal_sites for select using (true);

-- Owner-scoped SELECT policies (defense in depth; kept in sync with supabase/rls-policies.sql).
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
-- dumping_reports intentionally has NO policy: city/admin access goes through
-- the service-role API only.

-- ---------- GRANTS (pooler-created tables need explicit privileges) ----------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;

-- -------------------------------------------
-- payment_intents — real Paystack collections with simulation fallback
-- (when PAYSTACK_SECRET_KEY is unset, intents finalize as simulated)
-- -------------------------------------------
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  purpose text not null default 'topup' check (purpose in ('topup')),
  provider text not null default 'paystack',
  reference text unique not null,
  amount_ghs numeric(10,2) not null,
  channel text not null default 'momo',
  network text,
  status text not null default 'initiated' check (status in ('initiated','succeeded','failed')),
  simulated boolean not null default false,
  authorization_url text,
  access_code text,
  meta jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists payment_intents_user_created_idx on public.payment_intents (user_id, created_at desc);
drop policy if exists "payment_intents owner read" on public.payment_intents;
create policy "payment_intents owner read" on public.payment_intents for select using (auth.uid() = user_id);
grant select on public.payment_intents to authenticated;
grant all on public.payment_intents to service_role;

-- ---------- ADMIN COMMAND CENTRE (Task 18) ----------
-- Operator vetting state. Enforced when a driver tries to go online:
-- only 'approved' operators may receive jobs. Admin actions in
-- /api/admin/actions write these fields and audit_events rows.
alter table public.profiles add column if not exists vetting_status text not null default 'pending_review'
  check (vetting_status in ('pending_review','approved','rejected','suspended'));
alter table public.profiles add column if not exists vetting_note text;
alter table public.profiles add column if not exists vetted_by uuid;
alter table public.profiles add column if not exists vetted_at timestamptz;

-- Tamper-evident admin audit trail (spec 21: every staff action recorded).
-- RLS is enabled with NO policies: only the service role (server functions) can read/write.
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
create index if not exists audit_events_created_idx on public.audit_events (created_at desc);

-- ---------- COMMAND CENTRE v3 (Task 19) ----------
-- Platform control store: feature flags / kill switches (spec 20).
-- RLS enabled with NO policies: service role (server functions) only.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_by uuid,
  updated_by_name text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
grant all on public.app_settings to service_role;

-- Customer account blocking (spec 7: blocks and warnings, never silently).
alter table public.profiles add column if not exists account_status text not null default 'active'
  check (account_status in ('active','restricted'));
alter table public.profiles add column if not exists block_reason text;
alter table public.profiles add column if not exists blocked_at timestamptz;

-- Admin wallet corrections use the ledger (entries never edited, only added).
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('payment','payout','bonus','topup','subscription','commission','adjustment'));

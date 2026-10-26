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

-- ---------- GRANTS (pooler-created tables need explicit privileges) ----------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;

// Task 19 — Command Centre v3 migration: platform control + customer blocks
// 1. app_settings (feature flags / kill switches, spec 20)
// 2. profiles.account_status (block abusive customers, spec 7)
// 3. transactions type 'adjustment' (admin wallet corrections, spec 10)
// Run: bun scripts/migrate_command_v3.ts
import { SQL } from "bun"

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error("SUPABASE_DB_URL missing from .env")
  process.exit(1)
}
const sql = new SQL(url)

// 1. app_settings — key/value control store (service role only via RLS)
await sql.unsafe(`create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_by uuid,
  updated_by_name text not null default '',
  updated_at timestamptz not null default now()
)`)
await sql.unsafe(`alter table public.app_settings enable row level security`)
await sql.unsafe(`grant all on public.app_settings to service_role`)

// 2. customer account blocking
await sql.unsafe(`alter table public.profiles add column if not exists account_status text not null default 'active'`)
await sql.unsafe(`alter table public.profiles add column if not exists block_reason text`)
await sql.unsafe(`alter table public.profiles add column if not exists blocked_at timestamptz`)
try {
  await sql.unsafe(`alter table public.profiles drop constraint if exists profiles_account_status_check`)
  await sql.unsafe(`alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active','restricted'))`)
} catch (e) {
  console.log("constraint note:", (e as Error).message)
}

// 3. wallet adjustments need a ledger type (entries are never edited, only added)
try {
  await sql.unsafe(`alter table public.transactions drop constraint if exists transactions_type_check`)
  await sql.unsafe(`alter table public.transactions add constraint transactions_type_check check (type in ('payment','payout','bonus','topup','subscription','commission','adjustment'))`)
} catch (e) {
  console.log("txn constraint note:", (e as Error).message)
}

// 4. seed default flags (idempotent)
await sql.unsafe(`insert into public.app_settings (key, value, updated_by_name) values
  ('booking_enabled', 'true', 'system'),
  ('signups_enabled', 'true', 'system'),
  ('maintenance_mode', 'false', 'system')
on conflict (key) do nothing`)

// summary
const settings = await sql.unsafe(`select key, value from public.app_settings order by key`)
console.log("settings:", settings)
const cols = await sql.unsafe(`select column_name from information_schema.columns where table_name='profiles' and column_name in ('account_status','block_reason','blocked_at')`)
console.log("profile columns added:", cols.map((c: Record<string, unknown>) => c.column_name))
console.log("migration v3 OK")
process.exit(0)

// Task 18 — apply Command Centre migration (vetting columns + audit_events)
// and backfill demo data. Uses Bun's built-in Postgres client with DATABASE_URL.
import { SQL } from "bun"

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error("SUPABASE_DB_URL missing from .env")
  process.exit(1)
}
const sql = new SQL(url)

// 1. vetting columns
await sql.unsafe(`alter table public.profiles add column if not exists vetting_status text not null default 'pending_review'`)
await sql.unsafe(`alter table public.profiles add column if not exists vetting_note text`)
await sql.unsafe(`alter table public.profiles add column if not exists vetted_by uuid`)
await sql.unsafe(`alter table public.profiles add column if not exists vetted_at timestamptz`)
try {
  await sql.unsafe(`alter table public.profiles drop constraint if exists profiles_vetting_status_check`)
  await sql.unsafe(`alter table public.profiles add constraint profiles_vetting_status_check check (vetting_status in ('pending_review','approved','rejected','suspended'))`)
} catch (e) {
  console.log("constraint note:", (e as Error).message)
}

// 2. audit_events
await sql.unsafe(`create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
)`)
await sql.unsafe(`alter table public.audit_events enable row level security`)
await sql.unsafe(`create index if not exists audit_events_created_idx on public.audit_events (created_at desc)`)

// 3. backfill: existing accounts approved (demo fleet keeps working)...
await sql.unsafe(`update public.profiles set vetting_status = 'approved' where vetting_status is distinct from 'approved'`)
// ...but park two offline operators in the queue so the vetting flow is demonstrable
const res = await sql.unsafe(
  `update public.profiles set vetting_status = 'pending_review', vetting_note = 'Awaiting licence and vehicle document check'
   where role = 'driver' and email in ('driver5@kumbola.com', 'driver6@kumbola.com') returning email`
)
console.log("queued for review:", res.map((r: Record<string, unknown>) => r.email))

// summary
const counts = await sql.unsafe(`select vetting_status, count(*)::int as n from public.profiles group by 1 order by 1`)
console.log("vetting counts:", counts)
console.log("migration OK")
process.exit(0)

#!/usr/bin/env bun
/**
 * KumBola — Supabase keep-alive ping.
 *
 * Free-tier Supabase projects are paused after ~7 days without API activity.
 * This script generates three lightweight API calls (Auth health, a REST read,
 * one demo password grant) so the project keeps recording activity between
 * real deployments.
 *
 * Run: bun scripts/keepalive.ts
 * Scheduled: Z.ai cron job "KumBola Supabase keep-alive ping" (08:00 & 20:00 UTC daily).
 *
 * Only public-by-design values (project URL, publishable key, demo login) are used here.
 * Never print sb_secret_ / service-role / DB password values in any output.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''

if (!URL || !KEY) {
  console.error('keepalive: missing NEXT_PUBLIC_SUPABASE_URL or publishable key in env')
  process.exit(1)
}

let ok = true

// 1) Auth health
try {
  const r = await fetch(`${URL}/auth/v1/health`, { headers: { apikey: KEY } })
  console.log(`auth/health: ${r.status}`)
  if (!r.ok) ok = false
} catch (e) {
  console.error(
    `auth/health: FAILED — ${(e as Error).message} (DNS/NXDOMAIN usually means the project is PAUSED or deleted)`
  )
  ok = false
}

// 2) REST read on plans
try {
  const r = await fetch(`${URL}/rest/v1/plans?select=id&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  console.log(`rest/plans: ${r.status}`)
  if (!r.ok) ok = false
} catch (e) {
  console.error(`rest/plans: FAILED — ${(e as Error).message}`)
  ok = false
}

// 3) Demo password grant (real auth activity; failure is reported, not fatal for exit code? no — fatal)
try {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.DEMO_CUSTOMER_EMAIL ?? 'customer@kumbola.com',
      password: process.env.DEMO_CUSTOMER_PASSWORD ?? 'kumbola123',
    }),
  })
  console.log(`auth/demo-login: ${r.status}`)
  if (!r.ok) ok = false
} catch (e) {
  console.error(`auth/demo-login: FAILED — ${(e as Error).message}`)
  ok = false
}

console.log(ok ? 'keepalive: OK — project active' : 'keepalive: DEGRADED — inspect above')
process.exit(ok ? 0 : 2)

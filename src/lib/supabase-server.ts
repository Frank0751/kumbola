// ============================================================
// KumBola — server-side Supabase access (API routes only)
// Uses service role for data operations after verifying the
// caller's access token with Supabase Auth.
// ============================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!

let adminClient: SupabaseClient | null = null

/** Fetch wrapper that bypasses Next.js fetch caching entirely. */
const noStoreFetch = ((url: string | URL | Request, init?: RequestInit) =>
  fetch(url, { ...init, cache: 'no-store' })) as unknown as typeof fetch

/** Service-role client. Server use only. */
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: noStoreFetch },
    })
  }
  return adminClient
}

export type VerifiedUser = { userId: string; email: string | null; profile: Profile }

/** Verify a Bearer token and load the caller's profile. Returns null when invalid. */
export async function verifyUser(req: Request): Promise<VerifiedUser | null> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return null
  const admin = supabaseAdmin()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()
  if (profErr || !profile) return null
  return { userId: data.user.id, email: data.user.email ?? null, profile: profile as Profile }
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status })
}

/** Simulated GPS position near a disposal site (demo-mode geofence check). */
export function simulatedSitePosition(site: { lat: number; lng: number }, radiusM: number) {
  // jitter within ~80 m of the site centre so the geofence check passes
  const degPerM = 1 / 111320
  const r = (Math.random() * 0.8 + 0.1) * radiusM * 0.6 // 10–60% of radius
  const theta = Math.random() * Math.PI * 2
  const lat = site.lat + Math.sin(theta) * r * degPerM
  const lng = site.lng + Math.cos(theta) * r * degPerM / Math.cos((site.lat * Math.PI) / 180)
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
}

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

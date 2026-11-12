// ============================================================
// KumBola — platform control settings (server only)
// Backed by the app_settings table (service-role writes only).
// Used by every enforcement point: bookings, signups, banners.
// ============================================================
import { supabaseAdmin } from '@/lib/supabase-server'

/** Flags that fail-closed (treated as false when unreadable). */
const DEFAULT_FALSE = new Set(['maintenance_mode'])

/** Fetch selected control flags in one round trip.
 *  Kill switches fail open (app keeps working if the store is unreachable),
 *  banners fail closed (no maintenance notice unless confirmed). */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin().from('app_settings').select('key, value').in('key', keys)
  const out: Record<string, string> = {}
  for (const key of keys) out[key] = DEFAULT_FALSE.has(key) ? 'false' : 'true'
  for (const row of (data ?? []) as { key: string; value: string }[]) out[row.key] = row.value
  return out
}

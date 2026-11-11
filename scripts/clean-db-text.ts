/**
 * KumBola — one-off content cleanup for the live Supabase DB.
 * Strips emoji pictographs and em dashes from user-facing text that was
 * written before the "no emojis / no em dashes" client guideline:
 *   notifications.title, notifications.body, transactions.note
 * Run: bun scripts/clean-db-text.ts
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })

// emoji pictographs + variation selector + em dash (keep ★ ✓ · etc.)
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu
const EM_DASH = /—/g

function clean(s: string): string {
  return s.replace(EMOJI, '').replace(EM_DASH, ',').replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').trim()
}

async function cleanTable(table: 'notifications' | 'transactions', fields: string[]) {
  const { data, error } = await db.from(table).select(`id, ${fields.join(', ')}`)
  if (error) throw new Error(`${table}: ${error.message}`)
  let changed = 0
  for (const row of data ?? []) {
    const patch: Record<string, string> = {}
    for (const f of fields) {
      const v = row[f]
      if (typeof v === 'string') {
        const nv = clean(v)
        if (nv !== v) patch[f] = nv
      }
    }
    if (Object.keys(patch).length) {
      const { error: upErr } = await db.from(table).update(patch).eq('id', row.id)
      if (upErr) throw new Error(`${table} update ${row.id}: ${upErr.message}`)
      changed++
    }
  }
  console.log(`${table}: scanned ${(data ?? []).length}, cleaned ${changed}`)
}

async function main() {
  await cleanTable('notifications', ['title', 'body'])
  await cleanTable('transactions', ['note'])
  console.log('Done')
}
main().catch((e) => {
  console.error('Failed:', e.message)
  process.exit(1)
})

/**
 * KumBola — apply RLS policies to the live Supabase Postgres.
 * Run: bun supabase/apply-rls.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

const CONN = process.env.SUPABASE_DB_SESSION_POOL_URL || process.env.DATABASE_URL!

async function main() {
  console.log(`Connecting to: ${CONN.split('@')[1]}`)
  const client = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✅ Connected to Supabase Postgres')

  const sql = readFileSync(join(process.cwd(), 'supabase', 'rls-policies.sql'), 'utf8')
  await client.query(sql)
  console.log('✅ RLS policies applied')

  const { rows } = await client.query(
    "select tablename, policyname, cmd from pg_policies where schemaname='public' order by tablename, policyname"
  )
  console.log('Policies now live:')
  for (const r of rows) console.log(`  ${r.tablename}: ${r.policyname} (${r.cmd})`)

  await client.end()
}

main().catch((e) => {
  console.error('❌ apply-rls failed:', e.message)
  process.exit(1)
})

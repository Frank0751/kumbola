/**
 * KumBola — Supabase schema migration
 * Run: bun supabase/migrate.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

const CONN =
  process.env.SUPABASE_DB_SESSION_POOL_URL ||
  process.env.SUPABASE_DB_POOL_URL ||
  process.env.DATABASE_URL!

async function main() {
  console.log(`Connecting to: ${CONN.split('@')[1]}`)
  const client = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✅ Connected to Supabase Postgres')

  const sql = readFileSync(join(process.cwd(), 'supabase', 'schema.sql'), 'utf8')
  await client.query(sql)
  console.log('✅ Schema executed')

  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  )
  console.log('Tables in public schema:', rows.map((r) => r.table_name).join(', '))

  await client.end()
}

main().catch((e) => {
  console.error('❌ Migration failed:', e.message)
  process.exit(1)
})

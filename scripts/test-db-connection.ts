// Test whether the KumBola Supabase Postgres is still reachable via the pooler.
import pg from 'pg'

const url = process.env.SUPABASE_DB_SESSION_POOL_URL!
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 })
try {
  await client.connect()
  const v = await client.query('select current_database(), version()')
  console.log('CONNECTED:', v.rows[0].current_database, String(v.rows[0].version).slice(0, 40))
  const t = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  )
  console.log('public tables:', t.rows.map((r: { table_name: string }) => r.table_name).join(', ') || '(none)')
  for (const tbl of ['profiles', 'plans', 'bookings', 'transactions']) {
    try {
      const c = await client.query(`select count(*)::int as n from ${tbl}`)
      console.log(`count ${tbl}:`, c.rows[0].n)
    } catch (e) {
      console.log(`count ${tbl}: ERROR ${(e as Error).message.slice(0, 80)}`)
    }
  }
} catch (e) {
  console.log('CONNECT FAILED:', (e as Error).message.slice(0, 200))
} finally {
  try { await client.end() } catch {}
}

/**
 * Find the Supabase Supavisor pooler region for project klpikejqvvjbwrraytgh.
 * Wrong regions fail fast with "tenant not found"; the right one authenticates.
 * Run: bun scripts/find-pooler-region.ts
 */
import { Client } from 'pg'

const REGIONS = [
  'eu-west-2', 'eu-west-1', 'eu-central-1', 'eu-north-1', 'eu-west-3', 'eu-central-2',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1', 'sa-east-1',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
]
const PROJECT = 'klpikejqvvjbwrraytgh'
const PW = process.env.SUPABASE_DB_PASSWORD
if (!PW) {
  console.error('SUPABASE_DB_PASSWORD missing in env')
  process.exit(1)
}

for (const r of REGIONS) {
  const host = `aws-0-${r}.pooler.supabase.com`
  const client = new Client({
    connectionString: `postgresql://postgres.${PROJECT}:${PW}@${host}:5432/postgres`,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
  })
  try {
    await client.connect()
    const { rows } = await client.query('select current_database(), current_user')
    console.log(`✅ FOUND region: ${r} ->`, JSON.stringify(rows[0]))
    await client.end()
    console.log(`SUPABASE_DB_SESSION_POOL_URL=postgresql://postgres.${PROJECT}:<pw>@${host}:5432/postgres`)
    process.exit(0)
  } catch (e) {
    console.log(`${r}: ${(e as Error).message.slice(0, 70)}`)
  }
}
console.log('❌ no region matched')
process.exit(2)

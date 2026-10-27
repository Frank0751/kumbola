# KumBola — Kum Bola: kill trash 🇬🇭

**Ride-hailing for waste.** KumBola coordinates vetted Aboboyaa tricycle operators for
reliable, verified and inclusive waste collection in Greater Kumasi — built by
KoomBei Digital Limited (technology lead) with WasteCure Limited (operations lead).

This is the **web application** (Next.js 16 PWA-ready), the first deliverable before the
native mobile apps. Backend is **Supabase** (PostgreSQL + Auth), hosting target is **Netlify**.

---

## What's inside

| Surface | Description |
| --- | --- |
| **Landing site** | Problem stats, 5-step job cycle, plans & pricing, driver pitch, city section, FAQ, sticky footer |
| **Customer app** | Book pickups (3 sizes · now/today/tomorrow), MoMo wallet & top-ups, plan subscriptions with pickup credits, live status timeline, pickup codes, proof-of-disposal receipts |
| **Operator app** | Online toggle, available-jobs board, pickup-code collection, geofenced disposal verification (weight + recyclables), earnings & daily MoMo payouts, leaderboard, lease-to-own benefits |
| **City dashboard** | KPIs, 14-day activity chart, tonnage by municipality, verification rate, revenue mix, operator register, geotagged illegal-dumping reports |
| **Kumi AI** | Floating AI guide (context-aware per surface) answering pricing, booking, driver and platform questions via the LLM skill |

## Demo accounts (password `kumbola123`)

| Email | Role |
| --- | --- |
| `customer@kumbola.com` | Household customer (Ama Serwaa, Suame) |
| `business@kumbola.com` | Business customer (Jollof Junction Chop Bar) |
| `driver@kumbola.com` | Aboboyaa operator (Kwame Osei — has an active job to walk through) |
| `admin@kumbola.com` | City admin (City Sanitation Desk) |

## Local development

```bash
bun install
bun run dev          # http://localhost:3000
bun run lint         # ESLint
bun supabase/migrate.ts   # push supabase/schema.sql to Supabase Postgres
bun supabase/seed.ts      # (re)seed demo data
```

Environment lives in `.env` (all Supabase keys, pooler DB URLs, support contacts).

## Architecture notes

- **Auth**: Supabase Auth. Password grants hit the `/auth/v1/token` endpoint statelessly;
  the service-role client is never used for user sessions (avoids in-memory session
  poisoning). Access tokens are attached as `Bearer` to all API calls and auto-refreshed.
- **API routes** (`src/app/api/*`): verify the caller, then operate with the service role.
  `profiles` and all operational tables are RLS-locked; only `plans`/`disposal_sites` are
  publicly readable.
- **Proof of disposal**: `bookings` → `disposal_verifications` (GPS geofence check,
  timestamped photo path, site ticket). Driver payouts (85% + GHS 0.50/kg recyclables
  bonus) are released only when a booking reaches `verified`.
- **Payments**: wallet ledger in `transactions` (top-up, payment, subscription, payout,
  bonus, commission) — MoMo flows are simulated for the demo and wire to Paystack/Hubtel
  in production.
- **GPS in the web demo**: driver position at the disposal site is simulated server-side
  inside the geofence (native apps will supply real GPS).

## Deploying to Netlify

1. Push this repo to GitHub/GitLab.
2. In Netlify: *Add new site → Import from Git* — `netlify.toml` is preconfigured with
   `@netlify/plugin-nextjs`.
3. Set the environment variables listed at the bottom of `netlify.toml`.
4. Deploy. After the first deploy, also update **Supabase → Auth → URL Configuration →
   Site URL** to your Netlify domain.
5. Re-run `bun supabase/migrate.ts` against production (or import `supabase/schema.sql`
   in the Supabase SQL editor) — the schema is idempotent.

## Roadmap (from the grant proposal)

- USSD `*920*88#` booking, WhatsApp channel, community-agent bookings
- Native Android/iOS shells (Year 2) on top of the same API
- Paystack/Hubtel MoMo collections + daily payouts, e-trike telemetry, city open-data module

// POST /api/auth — signup | signin | refresh | signout
// NOTE: password grants hit the Supabase token endpoint directly (stateless),
// because signInWithPassword on the shared service client would overwrite its
// in-memory session and poison subsequent PostgREST calls.
import { supabaseAdmin, json, fail } from '@/lib/supabase-server'
import type { Profile } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const WELCOME_CREDIT = 20

interface AuthBody {
  action: 'signup' | 'signin' | 'refresh' | 'signout'
  email?: string
  password?: string
  refreshToken?: string
  fullName?: string
  phone?: string
  role?: 'customer' | 'driver'
  accountType?: 'household' | 'business' | 'institution'
  municipality?: string
  address?: string
  vehiclePlate?: string
}

interface TokenGrantResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  user?: { id: string; email: string | null } | null
  error?: string
  error_description?: string
  msg?: string
}

async function tokenGrant(grantType: 'password' | 'refresh_token', payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => null)) as TokenGrantResponse | null
  if (!res.ok || !data?.access_token) {
    const msg = data?.error_description || data?.error || data?.msg || 'Authentication failed'
    return { ok: false as const, message: msg }
  }
  return {
    ok: true as const,
    access_token: data.access_token,
    refresh_token: data.refresh_token!,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    userId: data.user?.id ?? '',
  }
}

async function buildSession(userId: string) {
  const admin = supabaseAdmin()
  const { data: profile, error } = await admin.from('profiles').select('*').eq('id', userId).single()
  if (error || !profile) return null
  return profile as Profile
}

export async function POST(req: Request) {
  let body: AuthBody
  try {
    body = (await req.json()) as AuthBody
  } catch {
    return fail('Invalid request body')
  }
  const admin = supabaseAdmin()

  if (body.action === 'signup') {
    const { email, password, fullName, role = 'customer' } = body
    if (!email || !password || !fullName) return fail('Name, email and password are required')
    if (password.length < 8) return fail('Password must be at least 8 characters')
    if (role === 'driver' && !body.vehiclePlate) return fail('Vehicle plate is required for operators')
    if (role === 'customer' && !body.address) return fail('Pickup address is required')

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, phone: body.phone ?? null },
    })
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Could not create account'
      if (msg.toLowerCase().includes('already')) return fail('An account with this email already exists — try signing in.', 409)
      return fail(msg, 400)
    }
    const userId = created.user.id

    const { error: profErr } = await admin.from('profiles').insert({
      id: userId,
      role,
      full_name: fullName,
      phone: body.phone ?? null,
      email,
      account_type: role === 'customer' ? (body.accountType ?? 'household') : null,
      municipality: body.municipality ?? null,
      address: body.address ?? null,
      vehicle_plate: role === 'driver' ? body.vehiclePlate : null,
      vehicle_type: role === 'driver' ? 'Aboboyaa 200cc' : null,
      base_municipality: role === 'driver' ? (body.municipality ?? null) : null,
      wallet_balance: role === 'customer' ? WELCOME_CREDIT : 0,
      is_online: false,
      license_verified: false,
    })
    if (profErr) {
      // rollback the auth user so partial signups don't linger
      await admin.auth.admin.deleteUser(userId)
      return fail(profErr.message, 500)
    }

    if (role === 'customer') {
      await admin.from('transactions').insert({
        user_id: userId,
        type: 'topup',
        amount_ghs: WELCOME_CREDIT,
        method: 'promo',
        reference: `WELCOME-${Date.now().toString(36).toUpperCase()}`,
        note: 'Welcome credit',
      })
    }
    await admin.from('notifications').insert({
      user_id: userId,
      title: 'Welcome to KumBola!',
      body:
        role === 'driver'
          ? 'Your operator account is ready. Finish onboarding with your association, then go online to receive jobs.'
          : 'Your account is ready. Book your first pickup or choose a plan that fits your household.',
      kind: 'success',
    })

    const grant = await tokenGrant('password', { email, password })
    const profile = await buildSession(userId)
    if (!profile) return json({ ok: true }, 201)
    if (!grant.ok) return json({ ok: true }, 201)
    return json({
      session: {
        access_token: grant.access_token,
        refresh_token: grant.refresh_token,
        expires_at: grant.expires_at,
        profile,
      },
    })
  }

  if (body.action === 'signin') {
    const { email, password } = body
    if (!email || !password) return fail('Email and password are required')
    const grant = await tokenGrant('password', { email, password })
    if (!grant.ok) {
      const msg = grant.message.toLowerCase().includes('invalid') ? 'Invalid email or password' : grant.message
      return fail(msg, 401)
    }
    const profile = await buildSession(grant.userId)
    if (!profile) return fail('Profile not found — contact support.', 403)
    return json({
      session: {
        access_token: grant.access_token,
        refresh_token: grant.refresh_token,
        expires_at: grant.expires_at,
        profile,
      },
    })
  }

  if (body.action === 'refresh') {
    const { refreshToken } = body
    if (!refreshToken) return fail('Refresh token required', 401)
    const grant = await tokenGrant('refresh_token', { refresh_token: refreshToken })
    if (!grant.ok) return fail('Session expired — sign in again.', 401)
    const profile = await buildSession(grant.userId)
    if (!profile) return fail('Profile not found.', 403)
    return json({
      session: {
        access_token: grant.access_token,
        refresh_token: grant.refresh_token,
        expires_at: grant.expires_at,
        profile,
      },
    })
  }

  if (body.action === 'signout') {
    return json({ ok: true })
  }

  return fail('Unknown action')
}

// ============================================================
// KumBola — Paystack collections (server-only)
// When PAYSTACK_SECRET_KEY is unset, wallets top up through the
// same intent flow but finalize as "simulated" — the demo keeps
// working exactly as before and goes live with zero code change.
// ============================================================
import { createHmac } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? ''

export function paystackEnabled(): boolean {
  return PAYSTACK_SECRET_KEY.startsWith('sk_test_') || PAYSTACK_SECRET_KEY.startsWith('sk_live_')
}

export interface PaymentIntentRow {
  id: string
  user_id: string
  purpose: string
  reference: string
  amount_ghs: number | string
  channel: string
  network: string | null
  status: 'initiated' | 'succeeded' | 'failed'
  simulated: boolean
}

/** Initialize a Paystack transaction. Returns the hosted checkout URL. */
export async function paystackInitialize(input: {
  email: string
  amountPesewas: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}): Promise<{ ok: boolean; authorizationUrl?: string; accessCode?: string; message?: string }> {
  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountPesewas,
        currency: 'GHS',
        reference: input.reference,
        callback_url: input.callbackUrl,
        channels: ['mobile_money', 'card'],
        metadata: input.metadata ?? {},
      }),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => null)) as
      | { status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string } }
      | null
    if (!res.ok || !data?.status || !data.data?.authorization_url) {
      return { ok: false, message: data?.message ?? `Paystack initialize failed (${res.status})` }
    }
    return { ok: true, authorizationUrl: data.data.authorization_url, accessCode: data.data.access_code }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Paystack unreachable' }
  }
}

/** Verify a transaction directly with Paystack (fallback when webhooks can't reach the host). */
export async function paystackVerify(reference: string): Promise<{
  ok: boolean
  status?: 'success' | 'failed' | 'abandoned' | 'ongoing'
  message?: string
}> {
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => null)) as
      | { status?: boolean; message?: string; data?: { status?: string } }
      | null
    if (!res.ok || !data?.status) return { ok: false, message: data?.message ?? `Paystack verify failed (${res.status})` }
    const s = data.data?.status
    if (s === 'success' || s === 'failed' || s === 'abandoned' || s === 'ongoing') return { ok: true, status: s }
    return { ok: true, status: 'ongoing' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Paystack unreachable' }
  }
}

/** Validate the x-paystack-signature header against the raw webhook body. */
export function paystackSignatureValid(rawBody: string, signature: string | null): boolean {
  if (!signature || !PAYSTACK_SECRET_KEY) return false
  const expected = createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')
  return expected === signature
}

/**
 * Credit the wallet for a succeeded intent — idempotent.
 * The conditional UPDATE claims the intent atomically, so a webhook
 * racing the verify-poll can never double-credit.
 */
export async function finalizeTopupIntent(
  admin: SupabaseClient,
  intent: PaymentIntentRow,
): Promise<{ ok: boolean; balance: number; alreadyDone: boolean; error?: string }> {
  const claim = await admin
    .from('payment_intents')
    .update({ status: 'succeeded', completed_at: new Date().toISOString() })
    .eq('id', intent.id)
    .neq('status', 'succeeded')
    .select('id')
  if (!claim.data?.length) {
    const { data: p } = await admin.from('profiles').select('wallet_balance').eq('id', intent.user_id).single()
    return { ok: true, balance: Number(p?.wallet_balance ?? 0), alreadyDone: true }
  }

  const amount = Number(intent.amount_ghs)
  const { data: prof } = await admin.from('profiles').select('wallet_balance').eq('id', intent.user_id).single()
  const balance = Number((Number(prof?.wallet_balance ?? 0) + amount).toFixed(2))
  const { error: balErr } = await admin
    .from('profiles')
    .update({ wallet_balance: balance })
    .eq('id', intent.user_id)
  if (balErr) return { ok: false, balance: 0, alreadyDone: false, error: balErr.message }

  await admin.from('transactions').insert({
    user_id: intent.user_id,
    type: 'topup',
    amount_ghs: amount,
    method: intent.channel === 'card' ? 'card' : 'momo',
    network: intent.network,
    reference: intent.reference,
    note: intent.simulated
      ? `${intent.network ?? 'MoMo'} top-up (simulated for demo)`
      : `Wallet top-up via Paystack${intent.network ? ` · ${intent.network}` : ''}`,
  })
  await admin.from('notifications').insert({
    user_id: intent.user_id,
    title: 'Wallet topped up',
    body: `GHS ${amount.toFixed(2)} received${intent.network ? ` via ${intent.network}` : ''}. Reference ${intent.reference}.`,
    kind: 'success',
  })
  return { ok: true, balance, alreadyDone: false }
}

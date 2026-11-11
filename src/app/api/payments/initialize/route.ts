// POST /api/payments/initialize — start a wallet top-up.
// Real mode: creates a Paystack hosted-checkout session and returns its URL.
// Simulation mode (no PAYSTACK_SECRET_KEY): finalizes the intent immediately,
// preserving the demo behaviour end to end.
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { finalizeTopupIntent, paystackEnabled, paystackInitialize, type PaymentIntentRow } from '@/lib/payments-server'

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  const body = (await req.json().catch(() => null)) as
    | { amount?: number; network?: string; channel?: 'momo' | 'card' }
    | null
  const amount = Math.round(Number(body?.amount) * 100) / 100
  if (!amount || amount < 5) return fail('Minimum top-up is GHS 5')
  if (amount > 2000) return fail('Maximum top-up is GHS 2,000 per transaction')
  const network = body?.network ?? null
  const channel = body?.channel === 'card' ? 'card' : 'momo'
  const admin = supabaseAdmin()

  const reference = `KBP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const simulated = !paystackEnabled()

  const { data: intent, error: insErr } = await admin
    .from('payment_intents')
    .insert({
      user_id: auth.userId,
      purpose: 'topup',
      reference,
      amount_ghs: amount,
      channel,
      network,
      status: 'initiated',
      simulated,
      meta: { email: auth.email },
    })
    .select('*')
    .single()
  if (insErr || !intent) return fail(insErr?.message ?? 'Could not start payment', 500)

  if (simulated) {
    const fin = await finalizeTopupIntent(admin, intent as PaymentIntentRow)
    if (!fin.ok) return fail(fin.error ?? 'Could not credit wallet', 500)
    return json({ reference, simulated: true, balance: fin.balance })
  }

  const origin = new URL(req.url).origin
  const init = await paystackInitialize({
    email: auth.email ?? 'guest@kumbola.com',
    amountPesewas: Math.round(amount * 100),
    reference,
    callbackUrl: `${origin}/?payref=${reference}`,
    metadata: { userId: auth.userId, purpose: 'topup', network },
  })
  if (!init.ok) {
    await admin.from('payment_intents').update({ status: 'failed' }).eq('id', (intent as PaymentIntentRow).id)
    return fail(init.message ?? 'Payment provider rejected the request', 502)
  }
  await admin
    .from('payment_intents')
    .update({ authorization_url: init.authorizationUrl, access_code: init.accessCode })
    .eq('id', (intent as PaymentIntentRow).id)
  return json({ reference, simulated: false, authorization_url: init.authorizationUrl })
}

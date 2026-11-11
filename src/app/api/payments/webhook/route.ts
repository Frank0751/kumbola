// POST /api/payments/webhook — Paystack server-to-server events.
// Only active when PAYSTACK_SECRET_KEY is configured; signature-verified
// with HMAC-SHA512 over the raw body. charge.success credits the wallet
// through the same idempotent finalize used by the verify poll.
import { json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { finalizeTopupIntent, paystackEnabled, paystackSignatureValid, type PaymentIntentRow } from '@/lib/payments-server'

export async function POST(req: Request) {
  if (!paystackEnabled()) return fail('Payments webhook not configured', 503)
  const raw = await req.text()
  if (!paystackSignatureValid(raw, req.headers.get('x-paystack-signature'))) {
    return fail('Invalid signature', 401)
  }
  const event = (await JSON.parse(raw).catch(() => null)) as
    | { event?: string; data?: { reference?: string; status?: string } }
    | null
  if (!event?.event) return fail('Invalid payload', 400)

  if (event.event === 'charge.success' && event.data?.reference) {
    const admin = supabaseAdmin()
    const { data: intent } = await admin
      .from('payment_intents')
      .select('*')
      .eq('reference', event.data.reference)
      .single()
    if (intent && (intent as PaymentIntentRow).status !== 'succeeded') {
      const fin = await finalizeTopupIntent(admin, intent as PaymentIntentRow)
      if (!fin.ok) return fail(fin.error ?? 'Could not credit wallet', 500)
    }
  }
  // Always acknowledge so Paystack stops retrying; unhandled events are ignored.
  return json({ received: true })
}

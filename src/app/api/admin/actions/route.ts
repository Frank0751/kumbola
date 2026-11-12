// POST /api/admin/actions — Command Centre mutations (role: admin)
// Every action is validated, executed and written to audit_events.
// Actions:
//   vet_driver      { driverId, decision: approve|reject|suspend|reinstate, note? }
//   set_site        { siteId, active: boolean }
//   dispatch        { bookingId, driverId }          (assign or reassign)
//   cancel_booking  { bookingId, reason }
//   review_disposal { verificationId, decision: approve|reject, note? }
//   adjust_wallet   { userId, amountGhs, reason }    (ledger entry, never edit balance directly)
//   set_account     { userId, restricted: boolean, reason? }   (block abusive customers)
//   notify_user     { userId, title, body, kind? }   (support desk message)
//   broadcast       { audience: customers|operators|all, title, body, kind? }
//   set_flag        { key, value }                   (feature flags / kill switches)
//   update_plan     { planId, priceGhs, pickupsPerMonth? }
//   set_report_status { reportId, status: open|reviewing|resolved }
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { recordAudit, notifyUser } from '@/lib/admin-actions'
import type { Profile } from '@/lib/types'

type Decision = 'approve' | 'reject' | 'suspend' | 'reinstate'

const FLAG_KEYS = new Set(['booking_enabled', 'signups_enabled', 'maintenance_mode'])

interface ActionsBody {
  action:
    | 'vet_driver'
    | 'set_site'
    | 'dispatch'
    | 'cancel_booking'
    | 'review_disposal'
    | 'adjust_wallet'
    | 'set_account'
    | 'notify_user'
    | 'broadcast'
    | 'set_flag'
    | 'update_plan'
    | 'set_report_status'
  driverId?: string
  siteId?: string
  bookingId?: string
  verificationId?: string
  userId?: string
  planId?: string
  reportId?: string
  decision?: Decision
  active?: boolean
  restricted?: boolean
  note?: string
  reason?: string
  amountGhs?: number
  title?: string
  body?: string
  kind?: 'info' | 'success' | 'warning' | 'error'
  audience?: 'customers' | 'operators' | 'all'
  key?: string
  value?: string
  priceGhs?: number
  pickupsPerMonth?: number
  status?: 'open' | 'reviewing' | 'resolved'
}

export async function POST(req: Request) {
  const auth = await verifyUser(req)
  if (!auth) return fail('Unauthorized', 401)
  if (auth.profile.role !== 'admin') return fail('Admin access only', 403)
  const admin = supabaseAdmin()
  const actor = { actorId: auth.userId, actorName: auth.profile.full_name }

  const body = (await req.json().catch(() => null)) as ActionsBody | null
  if (!body?.action) return fail('action required')

  switch (body.action) {
    // ---------------- operator vetting ----------------
    case 'vet_driver': {
      if (!body.driverId || !body.decision) return fail('driverId and decision required')
      if (!['approve', 'reject', 'suspend', 'reinstate'].includes(body.decision)) return fail('invalid decision')

      const target = (await admin.from('profiles').select('*').eq('id', body.driverId).eq('role', 'driver').maybeSingle()).data as Profile | null
      if (!target) return fail('Operator not found', 404)

      const statusMap: Record<Decision, Profile['vetting_status']> = {
        approve: 'approved',
        reinstate: 'approved',
        reject: 'rejected',
        suspend: 'suspended',
      }
      const vetting_status = statusMap[body.decision]
      const is_online = vetting_status === 'approved' ? target.is_online : false

      const { error } = await admin
        .from('profiles')
        .update({
          vetting_status,
          vetting_note: body.note?.trim() || null,
          vetted_by: auth.userId,
          vetted_at: new Date().toISOString(),
          is_online,
          license_verified: vetting_status === 'approved' ? true : target.license_verified,
        })
        .eq('id', body.driverId)
      if (error) return fail(error.message, 500)

      const titles: Record<Decision, string> = {
        approve: 'You are verified — welcome aboard',
        reinstate: 'Your operator account has been reinstated',
        reject: 'Operator application declined',
        suspend: 'Your operator account has been paused',
      }
      await notifyUser(
        admin,
        body.driverId,
        titles[body.decision],
        body.note?.trim() || (vetting_status === 'approved' ? 'You can now go online and receive jobs.' : 'Contact the KumBola operations desk for details.'),
        vetting_status === 'approved' ? 'success' : 'warning'
      )
      await recordAudit(admin, {
        ...actor,
        action: `vet_driver.${body.decision}`,
        targetType: 'operator',
        targetId: body.driverId,
        details: { name: target.full_name, note: body.note ?? null },
      })
      return json({ ok: true, vetting_status })
    }

    // ---------------- disposal site open/closed ----------------
    case 'set_site': {
      if (!body.siteId || typeof body.active !== 'boolean') return fail('siteId and active required')
      const site = (await admin.from('disposal_sites').select('name, is_active').eq('id', body.siteId).maybeSingle()).data as
        | { name: string; is_active: boolean }
        | null
      if (!site) return fail('Site not found', 404)

      const { error } = await admin.from('disposal_sites').update({ is_active: body.active }).eq('id', body.siteId)
      if (error) return fail(error.message, 500)

      if (!body.active && site.is_active) {
        // tell online operators so in-flight loads reroute (spec: site control)
        const online = (await admin.from('profiles').select('id').eq('role', 'driver').eq('is_online', true)).data ?? []
        await Promise.all(
          online.map((d) => notifyUser(admin, (d as { id: string }).id, `Disposal site closed: ${site.name}`, 'Route loads to the next approved site. Check the app for the updated list.', 'warning'))
        )
      }
      await recordAudit(admin, {
        ...actor,
        action: body.active ? 'site.open' : 'site.close',
        targetType: 'site',
        targetId: body.siteId,
        details: { name: site.name },
      })
      return json({ ok: true })
    }

    // ---------------- manual dispatch (assign / reassign) ----------------
    case 'dispatch': {
      if (!body.bookingId || !body.driverId) return fail('bookingId and driverId required')

      const booking = (await admin.from('bookings').select('*').eq('id', body.bookingId).maybeSingle()).data as
        | (Record<string, unknown> & { status: string; driver_id: string | null; reference: string; municipality: string })
        | null
      if (!booking) return fail('Booking not found', 404)
      if (!['pending', 'assigned'].includes(booking.status)) {
        return fail(`Cannot dispatch a booking in status "${booking.status}"`)
      }

      const driver = (await admin
        .from('profiles')
        .select('*')
        .eq('id', body.driverId)
        .eq('role', 'driver')
        .eq('vetting_status', 'approved')
        .maybeSingle()).data as Profile | null
      if (!driver) return fail('Operator not found or not approved', 404)

      const reassign = booking.status === 'assigned' && booking.driver_id !== null && booking.driver_id !== body.driverId
      const { error } = await admin
        .from('bookings')
        .update({ driver_id: body.driverId, status: 'assigned', assigned_at: new Date().toISOString() })
        .eq('id', body.bookingId)
      if (error) return fail(error.message, 500)

      await notifyUser(
        admin,
        body.driverId,
        `New job ${booking.reference}`,
        `Dispatch assigned you a pickup in ${booking.municipality}. Open the operator app to accept and navigate.`,
        'info'
      )
      if (reassign && booking.driver_id) {
        await notifyUser(admin, booking.driver_id, `Job ${booking.reference} reassigned`, 'This job was moved to another operator by dispatch.', 'warning')
      }
      await recordAudit(admin, {
        ...actor,
        action: reassign ? 'dispatch.reassign' : 'dispatch.assign',
        targetType: 'booking',
        targetId: body.bookingId,
        details: { reference: booking.reference, to: driver.full_name },
      })
      return json({ ok: true })
    }

    // ---------------- cancel with reason ----------------
    case 'cancel_booking': {
      if (!body.bookingId) return fail('bookingId required')
      const reason = body.reason?.trim() || 'Cancelled by operations'
      const booking = (await admin.from('bookings').select('status, driver_id, reference, customer_id').eq('id', body.bookingId).maybeSingle()).data as
        | { status: string; driver_id: string | null; reference: string; customer_id: string }
        | null
      if (!booking) return fail('Booking not found', 404)
      if (['verified', 'cancelled'].includes(booking.status)) return fail(`Cannot cancel a booking in status "${booking.status}"`)

      const { error } = await admin
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', body.bookingId)
      if (error) return fail(error.message, 500)

      if (booking.driver_id) {
        await notifyUser(admin, booking.driver_id, `Job ${booking.reference} cancelled`, reason, 'warning')
      }
      await notifyUser(admin, booking.customer_id, `Pickup ${booking.reference} cancelled`, `${reason}. Book again any time or contact support.`, 'warning')
      await recordAudit(admin, {
        ...actor,
        action: 'booking.cancel',
        targetType: 'booking',
        targetId: body.bookingId,
        details: { reference: booking.reference, reason },
      })
      return json({ ok: true })
    }

    // ---------------- disposal review queue ----------------
    case 'review_disposal': {
      if (!body.verificationId || !body.decision) return fail('verificationId and decision required')
      if (!['approve', 'reject'].includes(body.decision)) return fail('invalid decision')
      const ver = (await admin.from('disposal_verifications').select('*').eq('id', body.verificationId).maybeSingle()).data as
        | (Record<string, unknown> & { booking_id: string; driver_id: string; status: string })
        | null
      if (!ver) return fail('Verification not found', 404)

      const approve = body.decision === 'approve'
      if (approve && ver.status === 'approved') return fail('Already approved')

      const { error: verErr } = await admin
        .from('disposal_verifications')
        .update({ status: approve ? 'approved' : 'rejected' })
        .eq('id', body.verificationId)
      if (verErr) return fail(verErr.message, 500)

      const booking = (await admin.from('bookings').select('reference, status, customer_id').eq('id', ver.booking_id).maybeSingle()).data as
        | { reference: string; status: string; customer_id: string }
        | null
      if (booking) {
        const { error: bookErr } = await admin
          .from('bookings')
          .update(
            approve
              ? { status: 'verified', verified_at: new Date().toISOString() }
              : { status: 'collected', verified_at: null }
          )
          .eq('id', ver.booking_id)
        if (bookErr) return fail(bookErr.message, 500)

        await notifyUser(
          admin,
          ver.driver_id,
          approve ? `Disposal proof approved — ${booking.reference}` : `Disposal proof rejected — ${booking.reference}`,
          approve
            ? 'Verification complete. Your payout for this job is cleared.'
            : body.note?.trim() || 'The proof did not pass review. Return to the site or contact dispatch.',
          approve ? 'success' : 'error'
        )
        await recordAudit(admin, {
          ...actor,
          action: approve ? 'disposal.approve' : 'disposal.reject',
          targetType: 'verification',
          targetId: body.verificationId,
          details: { reference: booking.reference, note: body.note ?? null },
        })
      }
      return json({ ok: true })
    }

    // ---------------- wallet adjustment (ledger-backed, spec 10) ----------------
    case 'adjust_wallet': {
      if (!body.userId || typeof body.amountGhs !== 'number' || !Number.isFinite(body.amountGhs)) {
        return fail('userId and amountGhs required')
      }
      const amount = Math.round(body.amountGhs * 100) / 100
      if (amount === 0) return fail('Amount cannot be zero')
      if (Math.abs(amount) > 1000) return fail('Single adjustments are capped at GHS 1,000 — split the entry')
      const reason = body.reason?.trim() || ''
      if (reason.length < 4) return fail('A reason of at least 4 characters is required')

      const target = (await admin.from('profiles').select('id, full_name, wallet_balance, role').eq('id', body.userId).maybeSingle()).data as
        | { id: string; full_name: string; wallet_balance: number; role: string }
        | null
      if (!target) return fail('Account not found', 404)

      const newBalance = Math.max(0, Number(target.wallet_balance ?? 0) + amount)
      if (amount < 0 && Number(target.wallet_balance ?? 0) + amount < 0) {
        return fail(`Balance would go negative (currently GHS ${Number(target.wallet_balance ?? 0).toFixed(2)})`)
      }

      const { error: txnErr } = await admin.from('transactions').insert({
        user_id: target.id,
        type: 'adjustment',
        amount_ghs: Math.abs(amount),
        method: amount > 0 ? 'admin_credit' : 'admin_debit',
        reference: `ADJ-${Date.now().toString(36).toUpperCase()}`,
        note: reason,
      })
      if (txnErr) return fail(txnErr.message, 500)
      const { error: profErr } = await admin.from('profiles').update({ wallet_balance: newBalance }).eq('id', target.id)
      if (profErr) return fail(profErr.message, 500)

      await notifyUser(
        admin,
        target.id,
        amount > 0 ? 'Wallet credited' : 'Wallet adjusted',
        `${amount > 0 ? 'GHS ' + amount.toFixed(2) + ' credited' : 'GHS ' + Math.abs(amount).toFixed(2) + ' debited'} — ${reason}`,
        amount > 0 ? 'success' : 'warning'
      )
      await recordAudit(admin, {
        ...actor,
        action: amount > 0 ? 'wallet.credit' : 'wallet.debit',
        targetType: 'account',
        targetId: target.id,
        details: { name: target.full_name, amountGhs: amount, reason, newBalance },
      })
      return json({ ok: true, newBalance })
    }

    // ---------------- block / unblock an account (spec 7: never silently) ----------------
    case 'set_account': {
      if (!body.userId || typeof body.restricted !== 'boolean') return fail('userId and restricted required')
      if (body.restricted && (body.reason?.trim().length ?? 0) < 4) return fail('A reason of at least 4 characters is required')
      const target = (await admin.from('profiles').select('id, full_name, role, account_status').eq('id', body.userId).maybeSingle()).data as
        | { id: string; full_name: string; role: string; account_status: string }
        | null
      if (!target) return fail('Account not found', 404)
      if (target.role === 'admin') return fail('Admin accounts cannot be restricted from the portal')
      if (target.role === 'driver' && body.restricted) return fail('Use operator suspension for drivers (vet_driver → suspend)')

      const { error } = await admin
        .from('profiles')
        .update(
          body.restricted
            ? { account_status: 'restricted', block_reason: body.reason!.trim(), blocked_at: new Date().toISOString() }
            : { account_status: 'active', block_reason: null, blocked_at: null }
        )
        .eq('id', body.userId)
      if (error) return fail(error.message, 500)

      await notifyUser(
        admin,
        body.userId,
        body.restricted ? 'Account restricted' : 'Account restored',
        body.restricted
          ? `${body.reason!.trim()} — bookings are paused. Contact support to resolve this.`
          : 'Your account is active again. Welcome back.',
        body.restricted ? 'error' : 'success'
      )
      await recordAudit(admin, {
        ...actor,
        action: body.restricted ? 'account.block' : 'account.unblock',
        targetType: 'account',
        targetId: body.userId,
        details: { name: target.full_name, reason: body.restricted ? body.reason!.trim() : null },
      })
      return json({ ok: true })
    }

    // ---------------- direct support message ----------------
    case 'notify_user': {
      if (!body.userId || !body.title?.trim() || !body.body?.trim()) return fail('userId, title and body required')
      const kind = body.kind && ['info', 'success', 'warning', 'error'].includes(body.kind) ? body.kind : 'info'
      const target = (await admin.from('profiles').select('id, full_name').eq('id', body.userId).maybeSingle()).data as
        | { id: string; full_name: string }
        | null
      if (!target) return fail('Account not found', 404)
      await notifyUser(admin, body.userId, body.title.trim(), body.body.trim(), kind)
      await recordAudit(admin, {
        ...actor,
        action: 'support.message',
        targetType: 'account',
        targetId: body.userId,
        details: { name: target.full_name, title: body.title.trim() },
      })
      return json({ ok: true })
    }

    // ---------------- broadcast (spec 14: comms centre) ----------------
    case 'broadcast': {
      const audience = body.audience ?? 'all'
      if (!['customers', 'operators', 'all'].includes(audience)) return fail('invalid audience')
      if (!body.title?.trim() || !body.body?.trim()) return fail('title and body required')
      const kind = body.kind && ['info', 'success', 'warning', 'error'].includes(body.kind) ? body.kind : 'info'

      const roles = audience === 'customers' ? ['customer'] : audience === 'operators' ? ['driver'] : ['customer', 'driver']
      const { data: recipients } = await admin.from('profiles').select('id').in('role', roles)
      const list = (recipients ?? []) as { id: string }[]
      if (list.length === 0) return fail('No recipients found')
      await Promise.all(list.map((r) => notifyUser(admin, r.id, body.title!.trim(), body.body!.trim(), kind)))
      await recordAudit(admin, {
        ...actor,
        action: 'broadcast.sent',
        targetType: 'audience',
        targetId: audience,
        details: { title: body.title.trim(), recipients: list.length, kind },
      })
      return json({ ok: true, recipients: list.length })
    }

    // ---------------- feature flags / kill switches (spec 20) ----------------
    case 'set_flag': {
      if (!body.key || !FLAG_KEYS.has(body.key)) return fail(`Unknown flag — allowed: ${[...FLAG_KEYS].join(', ')}`)
      const value = body.value === 'true' ? 'true' : body.value === 'false' ? 'false' : null
      if (!value) return fail('value must be "true" or "false"')
      const current = (await admin.from('app_settings').select('value').eq('key', body.key).maybeSingle()).data as { value: string } | null
      if (current?.value === value) return json({ ok: true, unchanged: true })

      const { error } = await admin.from('app_settings').upsert({
        key: body.key,
        value,
        updated_by: auth.userId,
        updated_by_name: auth.profile.full_name,
        updated_at: new Date().toISOString(),
      })
      if (error) return fail(error.message, 500)
      await recordAudit(admin, {
        ...actor,
        action: 'flag.set',
        targetType: 'setting',
        targetId: body.key,
        details: { from: current?.value ?? '(unset)', to: value },
      })
      return json({ ok: true, value })
    }

    // ---------------- plans & pricing (spec 11: price books) ----------------
    case 'update_plan': {
      if (!body.planId || typeof body.priceGhs !== 'number' || !Number.isFinite(body.priceGhs)) {
        return fail('planId and priceGhs required')
      }
      const price = Math.round(body.priceGhs * 100) / 100
      if (price < 0 || price > 10000) return fail('Price out of range')
      const plan = (await admin.from('plans').select('id, name, price_ghs, pickups_per_month').eq('id', body.planId).maybeSingle()).data as
        | { id: string; name: string; price_ghs: number; pickups_per_month: number }
        | null
      if (!plan) return fail('Plan not found', 404)

      const update: Record<string, unknown> = { price_ghs: price }
      if (typeof body.pickupsPerMonth === 'number' && Number.isFinite(body.pickupsPerMonth) && body.pickupsPerMonth > 0 && body.pickupsPerMonth <= 100) {
        update.pickups_per_month = body.pickupsPerMonth
      }
      const { error } = await admin.from('plans').update(update).eq('id', body.planId)
      if (error) return fail(error.message, 500)
      await recordAudit(admin, {
        ...actor,
        action: 'plan.update',
        targetType: 'plan',
        targetId: plan.id,
        details: {
          name: plan.name,
          priceBefore: plan.price_ghs,
          priceAfter: price,
          pickupsBefore: plan.pickups_per_month,
          pickupsAfter: update.pickups_per_month ?? plan.pickups_per_month,
        },
      })
      return json({ ok: true })
    }

    // ---------------- dumping report triage ----------------
    case 'set_report_status': {
      if (!body.reportId || !body.status) return fail('reportId and status required')
      if (!['open', 'reviewing', 'resolved'].includes(body.status)) return fail('invalid status')
      const rep = (await admin.from('dumping_reports').select('id, location_text, status').eq('id', body.reportId).maybeSingle()).data as
        | { id: string; location_text: string; status: string }
        | null
      if (!rep) return fail('Report not found', 404)
      const { error } = await admin.from('dumping_reports').update({ status: body.status }).eq('id', body.reportId)
      if (error) return fail(error.message, 500)
      await recordAudit(admin, {
        ...actor,
        action: 'dumping.status',
        targetType: 'dumping_report',
        targetId: body.reportId,
        details: { location: rep.location_text, from: rep.status, to: body.status },
      })
      return json({ ok: true })
    }

    default:
      return fail('Unknown action')
  }
}

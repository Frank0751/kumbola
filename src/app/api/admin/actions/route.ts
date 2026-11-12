// POST /api/admin/actions — Command Centre mutations (role: admin)
// Every action is validated, executed and written to audit_events.
// Actions:
//   vet_driver      { driverId, decision: approve|reject|suspend|reinstate, note? }
//   set_site        { siteId, active: boolean }
//   dispatch        { bookingId, driverId }          (assign or reassign)
//   cancel_booking  { bookingId, reason }
//   review_disposal { verificationId, decision: approve|reject, note? }
import { verifyUser, json, fail, supabaseAdmin } from '@/lib/supabase-server'
import { recordAudit, notifyUser } from '@/lib/admin-actions'
import type { Profile } from '@/lib/types'

type Decision = 'approve' | 'reject' | 'suspend' | 'reinstate'

interface ActionsBody {
  action: 'vet_driver' | 'set_site' | 'dispatch' | 'cancel_booking' | 'review_disposal'
  driverId?: string
  siteId?: string
  bookingId?: string
  verificationId?: string
  decision?: Decision
  active?: boolean
  note?: string
  reason?: string
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

    default:
      return fail('Unknown action')
  }
}

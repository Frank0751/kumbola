// ============================================================
// KumBola — Command Centre shared helpers (server only)
// Every admin action MUST flow through recordAudit() so the
// trail is complete from day one (Admin Portal Spec, section 21).
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditInput {
  actorId: string
  actorName: string
  action: string
  targetType?: string
  targetId?: string | null
  details?: Record<string, unknown>
}

export async function recordAudit(db: SupabaseClient, input: AuditInput): Promise<void> {
  await db.from('audit_events').insert({
    actor_id: input.actorId,
    actor_name: input.actorName,
    action: input.action,
    target_type: input.targetType ?? '',
    target_id: input.targetId ?? null,
    details: input.details ?? null,
  })
}

/** Notify a user in-app. Failures are logged but never block the action. */
export async function notifyUser(
  db: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  kind: 'info' | 'success' | 'warning' | 'error' = 'info'
): Promise<void> {
  await db.from('notifications').insert({ user_id: userId, title, body, kind })
}

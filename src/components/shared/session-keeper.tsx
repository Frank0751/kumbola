'use client'

import { useEffect } from 'react'
import { useSession } from '@/lib/store'
import { api } from '@/lib/api-client'
import type { SessionPayload } from '@/lib/types'

/**
 * Refreshes the Supabase session when it is close to expiry.
 * Mount once per surface (marketing shell or app view) — never both.
 */
export function SessionKeeper() {
  const session = useSession((s) => s.session)
  const setSession = useSession((s) => s.setSession)

  useEffect(() => {
    if (!session) return
    const expiresIn = session.expires_at * 1000 - Date.now()
    if (expiresIn > 10 * 60 * 1000) return

    let cancelled = false
    api<{ session: SessionPayload }>('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'refresh', refreshToken: session.refresh_token }),
    })
      .then((res) => {
        if (!cancelled) setSession(res.session)
      })
      .catch(() => {
        if (!cancelled) setSession(null)
      })

    return () => {
      cancelled = true
    }
  }, [session, setSession])

  return null
}

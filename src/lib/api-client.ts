// ============================================================
// KumBola — client API wrapper
// Attaches the Supabase access token and refreshes it on 401.
// ============================================================
import { useSession } from '@/lib/store'
import type { SessionPayload } from '@/lib/types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface SessionLike {
  access_token: string
  refresh_token: string
  expires_at: number
}

async function refreshSession(refreshToken: string): Promise<SessionPayload | null> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh', refreshToken }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { session?: SessionPayload }
    if (!data.session) return null
    useSession.getState().setSession(data.session)
    return data.session
  } catch {
    return null
  }
}

async function withAuth(init: RequestInit, session: SessionLike): Promise<RequestInit> {
  const headers = new Headers(init.headers || {})
  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return { ...init, headers }
}

/** Authenticated fetch with one automatic token-refresh retry. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { session } = useSession.getState()
  if (!session) throw new ApiError('Not signed in', 401)

  let res = await fetch(path, await withAuth(init, session))
  if (res.status === 401) {
    const refreshed = await refreshSession(session.refresh_token)
    if (refreshed) {
      res = await fetch(path, await withAuth(init, refreshed))
    }
  }
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : null) ?? `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }
  return body as T
}

/** Public (unauthenticated) fetch. */
export async function publicApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : null) ?? `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }
  return body as T
}

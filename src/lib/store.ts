// ============================================================
// KumBola — client session store (zustand + localStorage persist)
// ============================================================
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { SessionPayload } from '@/lib/types'

export type AppView = 'landing' | 'customer' | 'driver' | 'admin'

interface SessionState {
  session: SessionPayload | null
  view: AppView
  hydrating: boolean
  setSession: (s: SessionPayload | null) => void
  setView: (v: AppView) => void
  setHydrating: (b: boolean) => void
  signOut: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      view: 'landing',
      hydrating: true,
      setSession: (s) =>
        set({
          session: s,
          view: s ? roleView(s.profile.role) : 'landing',
          hydrating: false,
        }),
      setView: (v) => set({ view: v }),
      setHydrating: (b) => set({ hydrating: b }),
      signOut: () => set({ session: null, view: 'landing' }),
    }),
    {
      name: 'kumbola-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ session: s.session, view: s.view }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrating(false)
      },
    }
  )
)

export function roleView(role: string): AppView {
  if (role === 'driver') return 'driver'
  if (role === 'admin') return 'admin'
  return 'customer'
}

'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, roleView } from '@/lib/store'
import { SessionKeeper } from '@/components/shared/session-keeper'
import { AuthDialog } from '@/components/auth/auth-dialog'
import { RoleSwitchDialog } from '@/components/shared/role-switch-dialog'
import { KumiChat } from '@/components/ai/kumi-chat'
import { SiteNav } from '@/components/landing/nav'
import { SiteFooter } from '@/components/landing/footer'

interface MarketingCta {
  /** "Book a pickup / Get started / Choose this plan" CTAs */
  onGetStarted: (role?: 'customer' | 'driver') => void
  /** "Sign in" CTAs */
  onSignIn: () => void
}

const CtaContext = createContext<MarketingCta>({
  onGetStarted: () => {},
  onSignIn: () => {},
})

/**
 * Whether a session existed in localStorage at first render. If yes, the
 * session about to appear in the store is a RESTORED one (not a fresh sign-in),
 * so the sign-in bounce must not fire. Read synchronously before zustand's
 * async rehydration can rewrite the entry.
 */
function hadPersistedSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('kumbola-session')
    if (!raw) return false
    return !!JSON.parse(raw)?.state?.session
  } catch {
    return false
  }
}

/**
 * CTA hooks for marketing sections. Sections call these instead of receiving
 * prop drills, so any page (server component) can compose them.
 */
export function useMarketingCta(): MarketingCta {
  return useContext(CtaContext)
}

/**
 * Shared chrome for every marketing page: sticky nav, footer, auth dialog,
 * Kumi AI widget and session upkeep. Content is passed as children.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  const { session, setView, hydrating } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authRole, setAuthRole] = useState<'customer' | 'driver'>('customer')
  const [switchOpen, setSwitchOpen] = useState(false)

  // Track null → session transitions so a fresh sign-in lands in the app.
  // A session restored from localStorage on page load is NOT fresh, so the
  // bounce is skipped whenever this page load started with a persisted
  // session — otherwise a signed-in user would be kicked from any sub-page.
  const prevSession = useRef(session)
  const restored = useRef(hadPersistedSession())
  useEffect(() => {
    if (hydrating) {
      prevSession.current = session
      return
    }
    if (!restored.current && !prevSession.current && session && pathname !== '/') {
      router.replace('/')
    }
    prevSession.current = session
  }, [session, hydrating, pathname, router])

  const enterApp = () => {
    if (!session) return
    setView(roleView(session.profile.role))
    router.push('/')
  }

  const onGetStarted: MarketingCta['onGetStarted'] = (role = 'customer') => {
    if (session) {
      // A signed-in customer tapping a driver CTA gets the one-account
      // upgrade flow instead of being dropped back into customer mode.
      if (role === 'driver' && session.profile.role === 'customer') {
        setSwitchOpen(true)
        return
      }
      enterApp()
      return
    }
    setAuthMode('signup')
    setAuthRole(role)
    setAuthOpen(true)
  }

  const onSignIn = () => {
    if (session) {
      enterApp()
      return
    }
    setAuthMode('signin')
    setAuthOpen(true)
  }

  return (
    <CtaContext.Provider value={{ onGetStarted, onSignIn }}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <SessionKeeper />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
        initialRole={authRole}
      />
      {session && session.profile.role === 'customer' && (
        <RoleSwitchDialog
          open={switchOpen}
          onOpenChange={setSwitchOpen}
          profile={session.profile}
          onSwitched={(profile) => {
            useSession.getState().setSession({ ...session, profile })
            router.push('/')
          }}
        />
      )}
      <KumiChat authed={!!session} />
    </CtaContext.Provider>
  )
}

'use client'

import { useSession } from '@/lib/store'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { LandingHome } from '@/components/landing'
import { SessionKeeper } from '@/components/shared/session-keeper'
import { KumiChat } from '@/components/ai/kumi-chat'
import { CustomerApp } from '@/components/customer/customer-app'
import { DriverApp } from '@/components/driver/driver-app'
import { AdminApp } from '@/components/admin/admin-app'
import { AppSplash } from '@/components/shared/app-splash'

/**
 * Home route. Signed-in users in an app view get their app surface; everyone
 * else gets the marketing home. Deep marketing topics live on their own
 * routes (/how-it-works, /plans, /drivers, /city, /faq, /legal) rendered by
 * the shared MarketingShell.
 */
export default function Home() {
  const { session, view, hydrating } = useSession()

  if (hydrating) return <AppSplash />

  if (session && view === 'customer') {
    return (
      <>
        <CustomerApp
          profile={session.profile}
          onExit={() => useSession.getState().setView('landing')}
        />
        <SessionKeeper />
        <KumiChat authed />
      </>
    )
  }

  if (session && view === 'driver') {
    return (
      <>
        <DriverApp
          profile={session.profile}
          onExit={() => useSession.getState().setView('landing')}
        />
        <SessionKeeper />
        <KumiChat authed />
      </>
    )
  }

  if (session && view === 'admin') {
    return (
      <>
        <AdminApp
          profile={session.profile}
          onExit={() => useSession.getState().setView('landing')}
        />
        <SessionKeeper />
        <KumiChat authed />
      </>
    )
  }

  return (
    <MarketingShell>
      <LandingHome />
    </MarketingShell>
  )
}

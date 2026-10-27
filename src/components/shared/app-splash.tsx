'use client'

import { Logo } from '@/components/brand/logo'

export function AppSplash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Logo className="h-14 w-auto" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        Loading KumBola…
      </div>
    </div>
  )
}

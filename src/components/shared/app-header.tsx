'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, Globe, LogOut, Loader2, Repeat, Truck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogoMark } from '@/components/brand/logo'
import { RoleSwitchDialog } from '@/components/shared/role-switch-dialog'
import { api } from '@/lib/api-client'
import { useSession } from '@/lib/store'
import { initials, timeAgo } from '@/lib/format'
import { toast } from 'sonner'
import type { MePayload, Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

const KIND_DOT: Record<string, string> = {
  info: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-gold',
  error: 'bg-destructive',
}

export function AppHeader({
  profile,
  onExit,
  accent,
}: {
  profile: {
    full_name: string
    role: string
    rating?: number
    vehicle_plate?: string | null
    municipality?: string | null
  }
  onExit: () => void
  accent?: string
}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<MePayload['notifications']>([])
  const [unread, setUnread] = useState(0)
  const [busy, setBusy] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = () => {
    api<MePayload>('/api/me')
      .then((me) => {
        setNotifications(me.notifications)
        setUnread(me.unread)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    timer.current = setInterval(load, 25000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  async function markAll() {
    setBusy(true)
    try {
      await api('/api/notifications', { method: 'POST', body: JSON.stringify({ all: true }) })
      setUnread(0)
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))
    } finally {
      setBusy(false)
    }
  }

  /** Apply a fresh profile from a role switch: setSession flips the view
   *  automatically via roleView(), so the app surface swaps in place. */
  function applySwitchedProfile(next: Profile) {
    const s = useSession.getState()
    if (s.session) s.setSession({ ...s.session, profile: next })
  }

  async function switchToCustomer() {
    setSwitching(true)
    try {
      const res = await api<{ profile?: Profile; error?: string }>('/api/roles', {
        method: 'POST',
        body: JSON.stringify({ role: 'customer' }),
      })
      if (res.profile) {
        applySwitchedProfile(res.profile)
        toast.success('Customer mode on — your operator history is saved.')
      } else {
        toast.error(res.error ?? 'Could not switch modes')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch modes')
    } finally {
      setSwitching(false)
    }
  }

  async function signOut() {
    try {
      await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signout' }) })
    } catch {
      /* session cleared locally regardless */
    }
    localStorage.removeItem('kumi-chat-history')
    useSession.getState().signOut()
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button onClick={onExit} className="flex items-center gap-2 rounded-lg focus-visible:outline-ring" aria-label="KumBola home">
          <LogoMark className="h-9 w-9" />
          <span className="hidden font-display text-lg font-bold sm:block">
            Kum<span className="text-primary">Bola</span>
          </span>
        </button>
        <span className={cn('hidden rounded-full border px-2.5 py-0.5 text-[11px] font-semibold md:inline-flex', accent ?? 'border-border bg-muted text-muted-foreground')}>
          {profile.role === 'driver' ? 'Operator app' : profile.role === 'admin' ? 'City dashboard' : 'Customer app'}
        </span>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" onClick={onExit} className="hidden gap-1.5 text-muted-foreground sm:inline-flex">
          <Globe className="h-4 w-4" /> Website
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative rounded-full p-2 hover:bg-muted focus-visible:outline-ring" aria-label={`Notifications (${unread} unread)`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold">Notifications</span>
              <button onClick={markAll} disabled={busy || unread === 0} className="text-xs text-primary hover:underline disabled:opacity-40">
                Mark all read
              </button>
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto scroll-slim">
              {notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>}
              {notifications.map((n) => (
                <div key={n.id} className={cn('flex gap-2.5 px-3 py-2.5', !n.read && 'bg-primary/5')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', KIND_DOT[n.kind] ?? 'bg-primary', n.read && 'opacity-30')} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted focus-visible:outline-ring" aria-label="Account menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-sm font-medium md:block">{profile.full_name.split(' ')[0]}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate">{profile.full_name}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {profile.role === 'driver' ? `Rating ${profile.rating?.toFixed(1) ?? '—'} ★` : profile.role === 'admin' ? 'City administrator' : 'KumBola customer'}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profile.role === 'customer' && (
              <DropdownMenuItem onClick={() => setSwitchOpen(true)}>
                <Truck className="h-4 w-4" /> Become an operator
              </DropdownMenuItem>
            )}
            {profile.role === 'driver' && (
              <DropdownMenuItem disabled={switching} onClick={switchToCustomer}>
                {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                Switch to customer mode
              </DropdownMenuItem>
            )}
            {profile.role !== 'admin' && (
              <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                <Repeat className="h-4 w-4" /> One account — both modes
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExit}>
              <Globe className="h-4 w-4" /> Back to website
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {profile.role === 'customer' && (
        <RoleSwitchDialog
          open={switchOpen}
          onOpenChange={setSwitchOpen}
          profile={profile as Profile}
          onSwitched={applySwitchedProfile}
        />
      )}
    </header>
  )
}

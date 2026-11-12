'use client'

// KumBola Command Centre — admin portal (Demo tier, per Admin Portal Specification)
// Tabs: Today · Analytics · Operations · Operators · Customers · Platform · Reports · Audit
// v3 (Task 19): global search (spec 3), full app control (flags/pricing/broadcast/
// wallets/blocks), report generation with controlled exports (spec 16), toasts.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Home, Store, Truck, Scale, ShieldCheck, ShieldAlert, Wallet, AlertTriangle, Radio,
  Landmark, MapPin, Users, Trash2, Clock3, TrendingUp, ClipboardCheck,
  History, CheckCircle2, XCircle, Loader2, TimerReset, Search, Cog, FileSpreadsheet, UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppHeader } from '@/components/shared/app-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DailyChart, BarList, Donut, MiniBars } from '@/components/admin/charts'
import { CustomersTab, PlatformTab, ReportsTab } from '@/components/admin/admin-extras'
import { api } from '@/lib/api-client'
import { ghs, num, timeAgo, initials } from '@/lib/format'
import type { AdminDashboardPayload, Profile, Booking } from '@/lib/types'
import { cn } from '@/lib/utils'

type Health = 'ok' | 'warn' | 'bad'
type Days = 7 | 14 | 30

interface SearchPerson {
  id: string
  role: string
  full_name: string
  phone: string | null
  municipality: string | null
  account_status: string
  vetting_status: string
  wallet_balance: number
}

export function AdminApp({
  profile,
  onExit,
}: {
  profile: { id: string; full_name: string; role: string }
  onExit: () => void
}) {
  const [data, setData] = useState<AdminDashboardPayload | null>(null)
  const [days, setDays] = useState<Days>(14)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('today')
  const [highlightId, setHighlightId] = useState<string | null>(null)

  // global search (spec 3)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ jobs: Booking[]; people: SearchPerson[] } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // dialogs
  const [detail, setDetail] = useState<Booking | null>(null)
  const [dispatchFor, setDispatchFor] = useState<Booking | null>(null)
  const [drill, setDrill] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<
    { kind: 'vet'; driver: Profile; decision: 'reject' | 'suspend' } | { kind: 'disposal'; id: string; reference: string } | null
  >(null)
  const [noteText, setNoteText] = useState('')

  const load = useCallback(async () => {
    try {
      setData(await api<AdminDashboardPayload>(`/api/admin?days=${days}`))
    } catch {
      /* transient */
    }
  }, [days])

  useEffect(() => {
    const initial = setTimeout(load, 0)
    const t = setInterval(load, 15000)
    return () => {
      clearTimeout(initial)
      clearInterval(t)
    }
  }, [load])

  // Ctrl+K focuses global search (spec 3)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await api<{ jobs: Booking[]; people: SearchPerson[] }>(`/api/admin/search?q=${encodeURIComponent(q)}`)
        setResults(res)
        setSearchOpen(true)
      } catch {
        /* transient */
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function act(body: Record<string, unknown>, label: string): Promise<boolean> {
    setBusy(label)
    setError(null)
    try {
      await api('/api/admin/actions', { method: 'POST', body: JSON.stringify(body) })
      await load()
      toast.success('Done — recorded in the audit trail.')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed'
      setError(msg)
      toast.error(msg)
      return false
    } finally {
      setBusy(null)
    }
  }

  function openPerson(p: SearchPerson) {
    setSearchOpen(false)
    setQuery('')
    setHighlightId(p.id)
    if (p.role === 'driver') setTab('operators')
    else if (p.role === 'customer') setTab('customers')
  }

  const k = data?.kpis
  const pendingVets = data?.vettingQueue.filter((d) => d.vetting_status === 'pending_review') ?? []
  const otherVets = data?.vettingQueue.filter((d) => d.vetting_status !== 'pending_review') ?? []
  const pendingReviews = data?.reviewQueue.filter((r) => r.status === 'pending') ?? []
  const decisionsWaiting = pendingVets.length + pendingReviews.length

  const health: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string; state: Health }[] = [
    {
      icon: ShieldCheck,
      label: 'Verified disposal',
      value: k ? `${k.verificationRate}%` : '—',
      hint: 'target ≥ 95%',
      state: !k ? 'ok' : k.verificationRate >= 95 ? 'ok' : k.verificationRate >= 70 ? 'warn' : 'bad',
    },
    {
      icon: ClipboardCheck,
      label: 'Decisions waiting',
      value: data ? String(decisionsWaiting) : '—',
      hint: 'vetting + disposal reviews',
      state: !data ? 'ok' : decisionsWaiting === 0 ? 'ok' : decisionsWaiting <= 3 ? 'warn' : 'bad',
    },
    {
      icon: Clock3,
      label: 'Awaiting dispatch',
      value: k ? num(k.pendingJobs) : '—',
      hint: 'target < 3',
      state: !k ? 'ok' : k.pendingJobs <= 2 ? 'ok' : k.pendingJobs <= 8 ? 'warn' : 'bad',
    },
    {
      icon: ShieldAlert,
      label: 'Repeat-pair jobs',
      value: data ? `${data.growth.repeatRatePct}%` : '—',
      hint: 'bypass signal · target ≤ 20%',
      state: !data ? 'ok' : data.growth.repeatRatePct <= 20 ? 'ok' : data.growth.repeatRatePct <= 40 ? 'warn' : 'bad',
    },
    {
      icon: MapPin,
      label: 'Sites open',
      value: data ? `${data.sites.filter((s) => s.is_active).length}/${data.sites.length}` : '—',
      hint: 'closed sites reroute loads',
      state: !data ? 'ok' : data.sites.every((s) => s.is_active) ? 'ok' : 'warn',
    },
    {
      icon: Truck,
      label: 'Operators online',
      value: k ? `${k.onlineDrivers}/${k.drivers}` : '—',
      hint: data ? `${data.vettingQueue.length} in vetting queue` : '',
      state: 'ok',
    },
    {
      icon: AlertTriangle,
      label: 'Open dumping reports',
      value: k ? num(k.openReports) : '—',
      hint: 'triage on the Platform tab',
      state: !k ? 'ok' : k.openReports === 0 ? 'ok' : k.openReports <= 3 ? 'warn' : 'bad',
    },
    {
      icon: Scale,
      label: 'Verified tonnage',
      value: k ? `${num(k.tonnesVerified, 1)} t` : '—',
      hint: 'proof-of-disposal backed',
      state: 'ok',
    },
    {
      icon: Wallet,
      label: 'Platform revenue',
      value: k ? ghs(k.revenueCommission + 1200, { compact: true }) : '—',
      hint: 'commission + data fees',
      state: 'ok',
    },
    {
      icon: Users,
      label: 'Driver payouts',
      value: k ? ghs(k.driverPayouts, { compact: true }) : '—',
      hint: '85% of fares + bonuses',
      state: 'ok',
    },
    {
      icon: Home,
      label: 'Households',
      value: k ? num(k.households) : '—',
      hint: k ? `${num(k.businesses)} businesses & institutions` : '',
      state: 'ok',
    },
    {
      icon: Store,
      label: 'Wallet float',
      value: k ? ghs(k.walletFloat, { compact: true }) : '—',
      hint: 'customer credit liability',
      state: 'ok',
    },
  ]

  const dispatchableDrivers = (data?.drivers ?? []).filter((d) => d.is_online && d.vetting_status === 'approved')

  return (
    <div className="min-h-screen bg-background">
      <AppHeader profile={profile} onExit={onExit} accent="border-primary/20 bg-forest text-forest-foreground" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
              <Landmark className="h-6 w-6 text-primary" /> Command Centre
            </h1>
            <p className="text-sm text-muted-foreground">Greater Kumasi · every pickup, cedi and operator under one roof</p>
          </div>
          <div className="flex items-center gap-2">
            {error && <span className="max-w-[240px] truncate rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</span>}
            <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> live · auto-refresh 15s
            </span>
          </div>
        </div>

        {/* ---------- global search (spec 3) ---------- */}
        <div className="relative mb-5">
          <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setSearchOpen(true)}
            placeholder="Search anything — job reference, customer, operator, phone, pickup code…  (Ctrl+K)"
            className="h-11 pl-9 pr-24 text-sm"
            aria-label="Global search"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">Ctrl K</kbd>
          {searchOpen && query.trim().length >= 2 && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
              <div className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-96 overflow-y-auto rounded-xl border bg-popover p-2 shadow-xl">
                {!results && <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>}
                {results && results.jobs.length === 0 && results.people.length === 0 && (
                  <p className="px-2 py-3 text-sm text-muted-foreground">No matches for &ldquo;{query.trim()}&rdquo;.</p>
                )}
                {results && results.jobs.length > 0 && (
                  <section className="mb-1">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Jobs</p>
                    {results.jobs.map((b) => (
                      <button
                        key={b.id}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setSearchOpen(false)
                          setQuery('')
                          setDetail(b)
                        }}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="font-mono text-xs">{b.reference}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{b.customer?.full_name ?? '—'} · {b.municipality} · {b.address}</span>
                        <StatusBadge status={b.status} />
                      </button>
                    ))}
                  </section>
                )}
                {results && results.people.length > 0 && (
                  <section>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">People</p>
                    {results.people.map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => openPerson(p)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={cn('text-[9px] font-bold', p.role === 'driver' ? 'bg-[color:var(--chart-2)]/15 text-[color:var(--chart-2)]' : 'bg-primary/10 text-primary')}>{initials(p.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.full_name}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {p.role === 'driver' ? `operator · ${p.vetting_status.replace('_', ' ')}` : `customer · ${p.municipality ?? '—'} · ${ghs(p.wallet_balance)}`}
                          {p.phone ? ` · ${p.phone.slice(0, 3)}•••` : ''}
                        </span>
                        {p.account_status === 'restricted' && <Badge variant="outline" className="h-5 border-destructive/40 px-1.5 text-[10px] text-destructive">restricted</Badge>}
                        <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </section>
                )}
              </div>
            </>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setHighlightId(null) }}>
          <TabsList className="mb-6 flex h-11 w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="today" className="gap-1.5">
              <TimerReset className="h-4 w-4" /> Today
              {decisionsWaiting > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5">{decisionsWaiting}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><TrendingUp className="h-4 w-4" /> Analytics</TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5"><MapPin className="h-4 w-4" /> Operations</TabsTrigger>
            <TabsTrigger value="operators" className="gap-1.5">
              <Truck className="h-4 w-4" /> Operators
              {pendingVets.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingVets.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5"><Users className="h-4 w-4" /> Customers</TabsTrigger>
            <TabsTrigger value="platform" className="gap-1.5">
              <Cog className="h-4 w-4" /> Platform
              {(k?.openReports ?? 0) > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{k?.openReports}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5"><FileSpreadsheet className="h-4 w-4" /> Reports</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5"><History className="h-4 w-4" /> Audit</TabsTrigger>
          </TabsList>

          {/* =============== TODAY =============== */}
          <TabsContent value="today" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {health.map((h) => (
                <HealthTile key={h.label} {...h} />
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Needs your decision</CardTitle>
                <p className="text-xs text-muted-foreground">Ranked by urgency. Every action is recorded in the audit trail. Humans decide — the system only surfaces.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* operator vetting */}
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Operator vetting {pendingVets.length > 0 && <Badge variant="destructive" className="h-5 px-1.5">{pendingVets.length}</Badge>}
                  </h3>
                  {pendingVets.length === 0 && <p className="py-1 text-sm text-muted-foreground">No operators awaiting verification.</p>}
                  <div className="space-y-2">
                    {pendingVets.map((d) => (
                      <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initials(d.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{d.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.vehicle_plate ?? '—'} · {d.base_municipality ?? d.municipality ?? '—'} · licence {d.license_verified ? 'verified' : 'not verified'}
                          </p>
                          {d.vetting_note && <p className="text-xs italic text-muted-foreground">&ldquo;{d.vetting_note}&rdquo;</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1" disabled={busy !== null} onClick={() => act({ action: 'vet_driver', driverId: d.id, decision: 'approve', note: 'Documents checked at onboarding desk' }, `vet-${d.id}`)}>
                            {busy === `vet-${d.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={busy !== null} onClick={() => { setNoteFor({ kind: 'vet', driver: d, decision: 'reject' }); setNoteText('') }}>
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* disposal review */}
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Disposal review queue {pendingReviews.length > 0 && <Badge variant="destructive" className="h-5 px-1.5">{pendingReviews.length}</Badge>}
                  </h3>
                  {pendingReviews.length === 0 && <p className="py-1 text-sm text-muted-foreground">All disposal proofs reviewed.</p>}
                  <div className="space-y-2">
                    {data?.reviewQueue.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {r.reference} · {r.driverName} <span className="font-normal text-muted-foreground">→ {r.siteName}</span>
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn('h-5 px-1.5', r.withinGeofence ? 'border-emerald-300 text-emerald-700' : 'border-destructive/40 text-destructive')}>
                              {r.withinGeofence ? `geofence ok${r.distanceM !== null ? ` · ${Math.round(r.distanceM)} m` : ''}` : `outside fence${r.distanceM !== null ? ` · ${Math.round(r.distanceM)} m` : ''}`}
                            </Badge>
                            <Badge variant="outline" className={cn('h-5 px-1.5', r.hasPhoto ? 'border-emerald-300 text-emerald-700' : 'border-border')}>{r.hasPhoto ? 'photo' : 'no photo'}</Badge>
                            <Badge variant="outline" className={cn('h-5 px-1.5', r.hasTicket ? 'border-emerald-300 text-emerald-700' : 'border-border')}>{r.hasTicket ? 'ticket' : 'no ticket'}</Badge>
                            <span>{num(r.weightKg, 1)} kg · {num(r.recyclablesKg, 1)} kg recyclables</span>
                          </p>
                        </div>
                        {r.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button size="sm" className="gap-1" disabled={busy !== null} onClick={() => act({ action: 'review_disposal', verificationId: r.id, decision: 'approve' }, `rev-${r.id}`)}>
                              {busy === `rev-${r.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={busy !== null} onClick={() => { setNoteFor({ kind: 'disposal', id: r.id, reference: r.reference }); setNoteText('') }}>
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className={cn('h-6', r.status === 'approved' ? 'border-emerald-300 text-emerald-700' : 'border-destructive/40 text-destructive')}>{r.status}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* suspended / rejected operators */}
                {otherVets.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Restricted operators</h3>
                    <div className="space-y-2">
                      {otherVets.map((d) => (
                        <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/[0.03] p-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{d.full_name} <Badge variant="outline" className="ml-1 h-5 border-destructive/40 px-1.5 text-destructive">{d.vetting_status.replace('_', ' ')}</Badge></p>
                            <p className="text-xs text-muted-foreground">{d.vehicle_plate ?? '—'} · {d.vetting_note ?? 'no note'}</p>
                          </div>
                          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => act({ action: 'vet_driver', driverId: d.id, decision: 'reinstate', note: 'Reinstated after review' }, `reinstate-${d.id}`)}>
                            Reinstate
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>

            {/* latest actions */}
            {data && data.auditEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1.5 text-base"><History className="h-4 w-4 text-primary" /> Latest staff actions</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {data.auditEvents.slice(0, 5).map((e) => (
                      <li key={e.id} className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs text-muted-foreground">{timeAgo(e.createdAt)}</span>
                        <span className="font-medium">{e.actorName}</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.action}</code>
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                          {Object.entries(e.details ?? {}).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* =============== ANALYTICS =============== */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Interactive — hover charts for detail, click a municipality to drill into its jobs.</p>
              <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
                {([7, 14, 30] as Days[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader className="pb-0"><CardTitle className="text-base">Daily activity &amp; verified tonnage</CardTitle></CardHeader>
              <CardContent>{data ? <DailyChart data={data.daily} /> : <Skeleton className="h-48 w-full" />}</CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1.5 text-base"><TrendingUp className="h-4 w-4 text-primary" /> Commission revenue</CardTitle></CardHeader>
                <CardContent>
                  {data ? (
                    <>
                      <MiniBars data={data.revenueDaily.map((r) => ({ date: r.date, value: r.ghs }))} unit="GHS" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {days}-day total: <strong className="text-foreground">{ghs(data.revenueDaily.reduce((s, r) => s + r.ghs, 0))}</strong>
                      </p>
                    </>
                  ) : (
                    <Skeleton className="h-40 w-full" />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1.5 text-base"><Users className="h-4 w-4 text-primary" /> New accounts</CardTitle></CardHeader>
                <CardContent>
                  {data ? (
                    <>
                      <MiniBars data={data.growthSeries.map((g) => ({ date: g.date, value: g.users }))} unit="signups" colorClass="fill-[color:var(--chart-2)]" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {num(data.growth.newUsers14d)} new accounts ({data.growth.newUsersToday} today) · <strong className="text-foreground">{num(data.growth.activeCustomers30d)}</strong> customers booked in the last 30 days
                      </p>
                    </>
                  ) : (
                    <Skeleton className="h-40 w-full" />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Verified tonnage by municipality</CardTitle></CardHeader>
                <CardContent>
                  {data ? (
                    <BarList
                      items={data.byMunicipality.map((m) => ({ label: m.municipality, value: m.tonnes, sub: `${m.bookings} jobs` }))}
                      onSelect={(m) => setDrill(m)}
                    />
                  ) : (
                    <Skeleton className="h-40 w-full" />
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">Click a municipality to inspect its jobs.</p>
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Job pipeline</CardTitle></CardHeader>
                  <CardContent className="pt-2">
                    {data ? (
                      <Donut
                        slices={[
                          { label: 'Verified', value: data.byStatus.find((s) => s.status === 'verified')?.count ?? 0, color: 'stroke-primary' },
                          { label: 'In progress', value: (data.byStatus.find((s) => s.status === 'assigned')?.count ?? 0) + (data.byStatus.find((s) => s.status === 'collected')?.count ?? 0), color: 'stroke-[color:var(--chart-2)]' },
                          { label: 'Awaiting dispatch', value: data.byStatus.find((s) => s.status === 'pending')?.count ?? 0, color: 'stroke-[color:var(--chart-4)]' },
                          { label: 'Cancelled', value: data.byStatus.find((s) => s.status === 'cancelled')?.count ?? 0, color: 'stroke-muted-foreground/30' },
                        ]}
                      />
                    ) : (
                      <Skeleton className="h-32 w-full" />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Revenue mix (YTD)</CardTitle></CardHeader>
                  <CardContent className="pt-2">
                    {data ? (
                      <Donut
                        slices={[
                          { label: 'Commission (15%)', value: data.revenueMix[0]?.value ?? 0, color: 'stroke-primary' },
                          { label: 'Recyclables margin', value: data.revenueMix[1]?.value ?? 0, color: 'stroke-[color:var(--chart-2)]' },
                          { label: 'Dashboard fees', value: data.revenueMix[2]?.value ?? 0, color: 'stroke-[color:var(--chart-4)]' },
                        ]}
                      />
                    ) : (
                      <Skeleton className="h-32 w-full" />
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Recyclables recovered: <strong className="text-foreground">{k ? num(k.recyclablesKg) : '—'} kg</strong>, about {k ? num(Math.round((k.recyclablesKg * 0.5) / 3)) : '—'} GHS net platform margin after driver bonuses.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* =============== OPERATIONS =============== */}
          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Live job list — click a row for the full timeline</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">Ref</th>
                      <th className="pb-2 pr-3">Customer</th>
                      <th className="pb-2 pr-3">Area</th>
                      <th className="pb-2 pr-3">Operator</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data || data.recentBookings.length === 0) && (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{!data ? 'Loading…' : 'No bookings'}</td></tr>
                    )}
                    {data?.recentBookings.map((b) => (
                      <tr key={b.id} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50" onClick={() => setDetail(b)}>
                        <td className="py-2.5 pr-3 font-mono text-xs">{b.reference}</td>
                        <td className="py-2.5 pr-3">{b.customer?.full_name ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{b.municipality}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{b.driver?.full_name ?? '—'}</td>
                        <td className="py-2.5 pr-3"><StatusBadge status={b.status} /></td>
                        <td className="py-2.5 pr-3 tabular-nums">{b.amount_ghs > 0 ? ghs(b.amount_ghs) : 'Plan'}</td>
                        <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                          {b.status === 'pending' && (
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setDispatchFor(b)}>Dispatch</Button>
                          )}
                          {b.status === 'assigned' && (
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setDispatchFor(b)}>Move</Button>
                              <Button size="sm" variant="outline" className="h-7 gap-1 border-destructive/40 text-xs text-destructive" onClick={() => act({ action: 'cancel_booking', bookingId: b.id, reason: 'Cancelled from operations console' }, `cancel-${b.id}`)}>Cancel</Button>
                            </div>
                          )}
                          {['collected', 'verified'].includes(b.status) && <span className="text-xs text-muted-foreground">in field</span>}
                          {b.status === 'cancelled' && <span className="text-xs text-muted-foreground">closed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Disposal site control</CardTitle>
                <p className="text-xs text-muted-foreground">Closing a site instantly notifies every online operator to reroute loads (Oti protocol).</p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {data?.sites.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', s.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{s.type.replace('_', ' ')} · {s.municipality} · geofence {s.geofence_radius_m} m</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-medium', s.is_active ? 'text-emerald-700' : 'text-destructive')}>{s.is_active ? 'Open' : 'Closed'}</span>
                      <Switch
                        checked={s.is_active}
                        disabled={busy !== null}
                        onCheckedChange={(active) => act({ action: 'set_site', siteId: s.id, active }, `site-${s.id}`)}
                        aria-label={`Toggle ${s.name}`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============== OPERATORS =============== */}
          <TabsContent value="operators" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <ShieldAlert className="h-4 w-4 text-primary" /> Integrity watchlist
                  {data && (
                    <Badge variant="outline" className={cn('ml-1', data.growth.repeatRatePct > 40 ? 'border-destructive/40 text-destructive' : data.growth.repeatRatePct > 20 ? 'border-gold/40 text-gold-foreground' : 'border-emerald-300 text-emerald-700')}>
                      {data.growth.repeatRatePct}% repeat-pair jobs
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Signals that a driver may be moving customers off-platform: serving the same household repeatedly, cancelling after seeing an address, or completing loads without verified disposal. Sorted with the highest risk first.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">Operator</th>
                      <th className="pb-2 pr-3">Jobs</th>
                      <th className="pb-2 pr-3">Verified</th>
                      <th className="pb-2 pr-3">Cancel-after-assign</th>
                      <th className="pb-2 pr-3">Repeat customers</th>
                      <th className="pb-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data || data.integrity.length === 0) && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">{!data ? 'Loading…' : 'No operator activity yet'}</td></tr>
                    )}
                    {data?.integrity.map((r) => (
                      <tr key={r.driverId} className="border-b last:border-0">
                        <td className="py-2.5 pr-3">
                          <span className="font-medium">{r.fullName}</span>
                          {r.flags.length > 0 && <span className="block text-[11px] text-destructive">{r.flags.join(' · ')}</span>}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">{r.completed}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{r.verificationPct === null ? '—' : `${r.verificationPct}%`}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{r.cancelAfterAssign}</td>
                        <td className={cn('py-2.5 pr-3 tabular-nums', r.repeatCustomers > 0 && 'font-semibold text-destructive')}>{r.repeatCustomers}</td>
                        <td className="py-2.5">
                          <Badge variant="outline" className={cn(
                            r.score >= 80 && 'border-emerald-300 text-emerald-700',
                            r.score >= 50 && r.score < 80 && 'border-gold/40 text-gold-foreground',
                            r.score < 50 && 'border-destructive/40 text-destructive'
                          )}>
                            {r.score}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Operator register</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">Operator</th>
                      <th className="pb-2 pr-3">Vehicle</th>
                      <th className="pb-2 pr-3">Base</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Vetting</th>
                      <th className="pb-2 pr-3">Jobs</th>
                      <th className="pb-2 pr-3">Rating</th>
                      <th className="pb-2">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data || data.drivers.length === 0) && (
                      <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">{!data ? 'Loading…' : 'No operators yet'}</td></tr>
                    )}
                    {data?.drivers.map((d) => (
                      <tr key={d.id} className={cn('border-b last:border-0', highlightId === d.id && 'bg-primary/5 ring-1 ring-inset ring-primary/40')}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{initials(d.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{d.full_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{d.vehicle_plate ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{d.base_municipality ?? d.municipality ?? '—'}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant="outline" className={cn('gap-1', d.is_online ? 'border-emerald-300 text-emerald-700' : 'border-border text-muted-foreground')}>
                            <Radio className="h-3 w-3" /> {d.is_online ? 'Online' : 'Offline'}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3">
                          <VettingBadge status={d.vetting_status} />
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">{d.total_jobs}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{d.rating.toFixed(1)} ★</td>
                        <td className="py-2.5 font-semibold tabular-nums">{ghs(d.total_earnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============== CUSTOMERS =============== */}
          <TabsContent value="customers">
            {data ? (
              <CustomersTab data={data} busy={busy} act={act} highlightId={highlightId} />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </TabsContent>

          {/* =============== PLATFORM =============== */}
          <TabsContent value="platform">
            {data ? (
              <PlatformTab data={data} busy={busy} act={act} highlightId={null} />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </TabsContent>

          {/* =============== REPORTS =============== */}
          <TabsContent value="reports">
            {data ? (
              <ReportsTab data={data} busy={busy} act={act} highlightId={null} />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </TabsContent>

          {/* =============== AUDIT =============== */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Audit trail</CardTitle>
                <p className="text-xs text-muted-foreground">Every staff action on money, operators, jobs, settings and sites — append-only, kept for 2+ years (spec 21). Download the full export on the Reports tab.</p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">When</th>
                      <th className="pb-2 pr-3">Staff</th>
                      <th className="pb-2 pr-3">Action</th>
                      <th className="pb-2 pr-3">Target</th>
                      <th className="pb-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data || data.auditEvents.length === 0) && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{!data ? 'Loading…' : 'No actions recorded yet'}</td></tr>
                    )}
                    {data?.auditEvents.map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground">{timeAgo(e.createdAt)}</td>
                        <td className="py-2.5 pr-3 font-medium">{e.actorName}</td>
                        <td className="py-2.5 pr-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.action}</code></td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground">{e.targetType || '—'}</td>
                        <td className="py-2.5 text-xs text-muted-foreground">
                          {Object.entries(e.details ?? {}).map(([key, value]) => `${key}: ${String(value)}`).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ---------- job detail dialog ---------- */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-mono text-base">{detail.reference} <StatusBadge status={detail.status} /></DialogTitle>
                <DialogDescription>{detail.customer?.full_name ?? '—'} · {detail.municipality}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <Field label="Address" value={detail.address} />
                  <Field label="Pickup code" value={detail.pickup_code} mono />
                  <Field label="Waste" value={`${detail.waste_size.replace('_', ' ')} · ~${detail.estimated_kg} kg`} />
                  <Field label="Preferred" value={detail.preferred_time} />
                  <Field label="Amount" value={detail.amount_ghs > 0 ? ghs(detail.amount_ghs) : 'Plan'} />
                  <Field label="Operator payout" value={ghs(detail.driver_payout_ghs)} />
                  <Field label="Operator" value={detail.driver?.full_name ?? 'Unassigned'} />
                  <Field label="Operator phone" value={detail.driver?.phone ?? '—'} />
                </div>
                {detail.notes && <p className="rounded-md bg-muted p-2 text-xs italic text-muted-foreground">&ldquo;{detail.notes}&rdquo;</p>}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lifecycle</p>
                  <ol className="space-y-1.5">
                    {([
                      ['Booked', detail.created_at],
                      ['Assigned', detail.assigned_at],
                      ['Collected', detail.collected_at],
                      ['Verified at site', detail.verified_at],
                      ['Cancelled', detail.cancelled_at],
                    ] as const).map(([label, at]) => (
                      <li key={label} className="flex items-center gap-2 text-xs">
                        <span className={cn('h-2 w-2 rounded-full', at ? 'bg-primary' : 'bg-muted-foreground/25')} />
                        <span className={cn(at ? 'font-medium' : 'text-muted-foreground/60')}>{label}</span>
                        {at && <span className="text-muted-foreground">{new Date(at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <DialogFooter className="gap-2">
                {detail.status === 'pending' && <Button size="sm" onClick={() => { setDispatchFor(detail); setDetail(null) }}>Dispatch operator</Button>}
                {detail.status === 'assigned' && <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => { act({ action: 'cancel_booking', bookingId: detail.id, reason: 'Cancelled from job detail' }, `cancel-${detail.id}`); setDetail(null) }}>Cancel job</Button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------- dispatch dialog ---------- */}
      <Dialog open={dispatchFor !== null} onOpenChange={(open) => !open && setDispatchFor(null)}>
        <DialogContent className="max-w-md">
          {dispatchFor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Dispatch {dispatchFor.reference}</DialogTitle>
                <DialogDescription>{dispatchFor.municipality} · {dispatchFor.address}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">Online, approved operators only. The operator is notified instantly.</p>
                {dispatchableDrivers.length === 0 && <p className="py-2 text-muted-foreground">No approved operators online right now.</p>}
                {dispatchableDrivers.map((d) => (
                  <button
                    key={d.id}
                    className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={async () => {
                      const ok = await act({ action: 'dispatch', bookingId: dispatchFor.id, driverId: d.id }, `dispatch-${dispatchFor.id}`)
                      if (ok) setDispatchFor(null)
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{initials(d.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.full_name}</p>
                      <p className="text-xs text-muted-foreground">{d.vehicle_plate ?? '—'} · {d.base_municipality ?? d.municipality} · {d.rating.toFixed(1)} ★ · {d.total_jobs} jobs</p>
                    </div>
                    {busy === `dispatch-${dispatchFor.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------- municipality drill-down ---------- */}
      <Dialog open={drill !== null} onOpenChange={(open) => !open && setDrill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{drill} — recent jobs</DialogTitle>
            <DialogDescription>From the most recent 500 bookings.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-1.5 overflow-y-auto text-sm">
            {data?.recentBookings.filter((b) => b.municipality === drill).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs">
                <span className="font-mono">{b.reference}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{b.customer?.full_name ?? '—'} · {b.driver?.full_name ?? 'unassigned'}</span>
                <StatusBadge status={b.status} />
              </div>
            ))}
            {data && data.recentBookings.filter((b) => b.municipality === drill).length === 0 && (
              <p className="py-4 text-center text-muted-foreground">No recent jobs here.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- reject / suspend note dialog ---------- */}
      <Dialog open={noteFor !== null} onOpenChange={(open) => !open && setNoteFor(null)}>
        <DialogContent className="max-w-md">
          {noteFor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  {noteFor.kind === 'vet'
                    ? `${noteFor.decision === 'reject' ? 'Reject' : 'Suspend'} ${noteFor.driver.full_name}`
                    : `Reject disposal proof — ${noteFor.reference}`}
                </DialogTitle>
                <DialogDescription>The note is delivered to the operator and recorded in the audit trail.</DialogDescription>
              </DialogHeader>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Reason — e.g. licence expired, documents unreadable, photo does not show the site…" rows={3} />
              <DialogFooter>
                <Button
                  disabled={busy !== null || noteText.trim().length < 4}
                  onClick={async () => {
                    if (noteFor.kind === 'vet') {
                      const ok = await act({ action: 'vet_driver', driverId: noteFor.driver.id, decision: noteFor.decision, note: noteText.trim() }, 'note')
                      if (ok) setNoteFor(null)
                    } else {
                      const ok = await act({ action: 'review_disposal', verificationId: noteFor.id, decision: 'reject', note: noteText.trim() }, 'note')
                      if (ok) setNoteFor(null)
                    }
                  }}
                >
                  {busy === 'note' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('truncate text-sm font-medium', mono && 'font-mono')}>{value || '—'}</p>
    </div>
  )
}

function VettingBadge({ status }: { status: Profile['vetting_status'] }) {
  const map: Record<Profile['vetting_status'], { label: string; cls: string }> = {
    approved: { label: 'Approved', cls: 'border-emerald-300 text-emerald-700' },
    pending_review: { label: 'Pending review', cls: 'border-gold/40 text-gold-foreground' },
    rejected: { label: 'Rejected', cls: 'border-destructive/40 text-destructive' },
    suspended: { label: 'Suspended', cls: 'border-destructive/40 text-destructive' },
  }
  return <Badge variant="outline" className={cn('h-5 px-1.5 text-[11px]', map[status].cls)}>{map[status].label}</Badge>
}

function HealthTile({
  icon: Icon,
  label,
  value,
  hint,
  state,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
  state: Health
}) {
  return (
    <Card className={cn(
      'border-l-4',
      state === 'ok' && 'border-l-emerald-500/70',
      state === 'warn' && 'border-l-gold',
      state === 'bad' && 'border-l-destructive'
    )}>
      <CardContent className="p-4">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
          <span className={cn(
            'ml-auto h-2 w-2 rounded-full',
            state === 'ok' && 'bg-emerald-500',
            state === 'warn' && 'bg-gold',
            state === 'bad' && 'bg-destructive'
          )} />
        </div>
        <p className="font-display text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

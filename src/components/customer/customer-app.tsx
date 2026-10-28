'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Wallet, Plus, MapPin, Package, Clock3, Trash2, ShieldCheck, Ticket,
  Home as HomeIcon, Store, Landmark, Truck, Receipt, Sparkles, Loader2, BadgeCheck,
} from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { StatusBadge, StatusTimeline } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api-client'
import { ghs, timeAgo, dateTimeShort, num } from '@/lib/format'
import { WASTE_SIZES, PLAN_CARDS, MOMO_NETWORKS, MUNICIPALITY_NAMES } from '@/lib/constants'
import type { MePayload, Booking, Transaction, WasteSize, PreferredTime, Plan } from '@/lib/types'
import { cn } from '@/lib/utils'

const ACCOUNT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  household: HomeIcon,
  business: Store,
  institution: Landmark,
}

export function CustomerApp({
  profile: initialProfile,
  onExit,
}: {
  profile: { id: string; full_name: string; role: string; municipality: string | null }
  onExit: () => void
}) {
  const [me, setMe] = useState<MePayload | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [wallet, setWallet] = useState<{ balance: number; transactions: Transaction[] } | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [topUpOpen, setTopUpOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [meRes, bkRes, wRes] = await Promise.all([
        api<MePayload>('/api/me'),
        api<{ bookings: Booking[] }>('/api/bookings'),
        api<{ balance: number; transactions: Transaction[] }>('/api/wallet'),
      ])
      setMe(meRes)
      setBookings(bkRes.bookings)
      setWallet(wRes)
    } catch (err) {
      if (err instanceof Error && err.message.includes('Not signed in')) return
    }
  }, [])

  useEffect(() => {
    const initial = setTimeout(load, 0)
    const t = setInterval(load, 10000)
    return () => {
      clearTimeout(initial)
      clearInterval(t)
    }
  }, [load])

  const profile = me?.profile ?? { ...initialProfile, wallet_balance: 0, plan_credits: 0, plan_id: null, account_type: 'household' as const, address: null }
  const plan: Plan | null = me?.plan ?? null
  const active = bookings.filter((b) => ['pending', 'assigned', 'collected'].includes(b.status))
  const done = bookings.filter((b) => b.status === 'verified')

  return (
    <div className="min-h-screen bg-background">
      <AppHeader profile={{ ...profile, rating: undefined }} onExit={onExit} accent="border-primary/20 bg-primary/10 text-primary" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              Medaase, {profile.full_name.split(' ')[0]}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.account_type ? profile.account_type[0].toUpperCase() + profile.account_type.slice(1) : 'Household'} · {profile.municipality ?? 'Greater Kumasi'}
            </p>
          </div>
          <Button size="lg" onClick={() => setBookOpen(true)} className="h-12 gap-2 text-base shadow-md">
            <Plus className="h-5 w-5" /> Book pickup
          </Button>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 h-11 w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5"><Sparkles className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5"><Package className="h-4 w-4" /> Bookings <Badge variant="secondary" className="ml-1 h-5 px-1.5">{bookings.length}</Badge></TabsTrigger>
            <TabsTrigger value="wallet" className="gap-1.5"><Wallet className="h-4 w-4" /> Wallet</TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5"><BadgeCheck className="h-4 w-4" /> Plans</TabsTrigger>
          </TabsList>

          {/* ---------------- OVERVIEW ---------------- */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-primary/15">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Wallet className="h-4 w-4 text-primary" /> KumBola wallet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl font-bold tabular-nums">{wallet ? ghs(wallet.balance) : <Skeleton className="h-9 w-28" />}</div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setTopUpOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> Top up</Button>
                    {plan && (
                      <Badge variant="secondary" className="gap-1">
                        <BadgeCheck className="h-3 w-3 text-primary" /> {plan_credits_label(profile.plan_credits)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Your impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-3xl font-bold tabular-nums">{done.length}</p>
                  <p className="text-xs text-muted-foreground">pickups with verified disposal</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ≈ {num(done.reduce((s, b) => s + (b.verification?.weight_kg ?? b.estimated_kg), 0), 0)} kg kept out of drains & dumps
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BadgeCheck className="h-4 w-4 text-primary" /> Current plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {plan ? (
                    <>
                      <p className="font-display text-xl font-bold">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan_credits_label(profile.plan_credits)} · renews monthly</p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-xl font-bold">Pay-as-you-go</p>
                      <p className="text-xs text-muted-foreground">Activate a plan to save more</p>
                    </>
                  )}
                  <Button size="sm" variant="link" className="mt-1 h-7 px-0 text-primary" onClick={() => document.getElementById('plans-tab')?.click()}>
                    {plan ? 'Manage plans →' : 'Browse plans →'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Active pickups</CardTitle>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> live
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                {active.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Truck className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No active pickups. Your bin overfloweth? Book one!</p>
                    <Button size="sm" variant="outline" onClick={() => setBookOpen(true)}>Book a pickup</Button>
                  </div>
                )}
                {active.map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={load} compact />
                ))}
              </CardContent>
            </Card>

            {done.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Latest verified receipts</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {done.slice(0, 4).map((b) => <ReceiptRow key={b.id} booking={b} />)}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------------- BOOKINGS ---------------- */}
          <TabsContent value="bookings" className="space-y-4">
            {bookings.length === 0 && (
              <Card><CardContent className="py-14 text-center text-muted-foreground">No bookings yet — your first pickup is one tap away.</CardContent></Card>
            )}
            {bookings.map((b) => <BookingCard key={b.id} booking={b} onCancel={load} />)}
          </TabsContent>

          {/* ---------------- WALLET ---------------- */}
          <TabsContent value="wallet" className="space-y-4">
            <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Available balance</p>
                  <p className="font-display text-4xl font-bold tabular-nums">{wallet ? ghs(wallet.balance) : '—'}</p>
                </div>
                <Button size="lg" onClick={() => setTopUpOpen(true)} className="gap-2"><Plus className="h-5 w-5" /> Top up with MoMo</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Transaction history</CardTitle></CardHeader>
              <CardContent className="divide-y">
                {(!wallet || wallet.transactions.length === 0) && <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet</p>}
                {wallet?.transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    <span className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      t.type === 'topup' || t.type === 'bonus' ? 'bg-emerald-100 text-emerald-700' : t.type === 'payment' || t.type === 'subscription' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground',
                    )}>
                      {t.type === 'topup' ? <Plus className="h-4 w-4" /> : t.type === 'bonus' ? <Sparkles className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{txn_label(t)}</p>
                      <p className="text-xs text-muted-foreground">{dateTimeShort(t.created_at)} {t.reference ? `· ${t.reference}` : ''}</p>
                    </div>
                    <span className={cn('text-sm font-bold tabular-nums', t.type === 'topup' || t.type === 'bonus' ? 'text-emerald-600' : 'text-foreground')}>
                      {t.type === 'topup' || t.type === 'bonus' ? '+' : '−'}{ghs(t.amount_ghs).replace('GHS ', 'GHS ')}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- PLANS ---------------- */}
          <TabsContent value="plans" id="plans-tab" className="space-y-4">
            <div className="rounded-xl border bg-secondary/50 p-4 text-sm text-secondary-foreground">
              <Sparkles className="mb-1 h-4 w-4 text-primary" />
              Plans are charged from your wallet balance. Credits apply automatically at booking — a compound plan costs about GHS 1 a day.
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PLAN_CARDS.map((p) => {
                const isCurrent = plan?.id === p.id
                return (
                  <Card key={p.id} className={cn('flex flex-col', isCurrent && 'ring-2 ring-primary')}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-display text-lg">{p.name}</CardTitle>
                        {isCurrent && <Badge className="bg-primary text-primary-foreground">Current</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{p.target}</p>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <div>
                        <span className="font-display text-3xl font-bold">{ghs(p.price)}</span>
                        <span className="text-xs text-muted-foreground"> {p.per}</span>
                      </div>
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {p.features.map((f) => (
                          <li key={f} className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-primary" /> {f}</li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-2">
                        <PlanButton planId={p.id} planName={p.name} price={p.price} isCurrent={isCurrent} balance={wallet?.balance ?? 0} onDone={load} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BookDialog open={bookOpen} onOpenChange={setBookOpen} profile={profile} planCredits={profile.plan_credits} onBooked={load} />
      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} onDone={load} />
    </div>
  )
}

function plan_credits_label(n: number) {
  return n === 1 ? '1 pickup credit' : `${n} pickup credits`
}

function txn_label(t: Transaction): string {
  switch (t.type) {
    case 'topup': return `Wallet top-up${t.network ? ` · ${t.network}` : ''}`
    case 'payment': return `Pickup payment${t.booking_id ? '' : ''}`
    case 'subscription': return t.note ?? 'Plan subscription'
    case 'payout': return t.note ?? 'Driver payout'
    case 'bonus': return t.note ?? 'Recyclables bonus'
    default: return t.note ?? t.type
  }
}

/* ---------------- Booking card ---------------- */

function BookingCard({ booking: b, onCancel, compact = false }: { booking: Booking; onCancel: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const DriverIcon = b.customer?.account_type === 'business' ? Store : b.customer?.account_type === 'institution' ? Landmark : HomeIcon

  async function cancel() {
    setBusy(true)
    try {
      await api('/api/bookings/actions', { method: 'POST', body: JSON.stringify({ bookingId: b.id, action: 'cancel' }) })
      toast.success('Booking cancelled — wallet refunded')
      onCancel()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('rounded-xl border p-4', compact && 'bg-card')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{b.reference}</span>
            <StatusBadge status={b.status} />
            {b.used_credit && <Badge variant="outline" className="text-[10px]">Plan credit</Badge>}
          </div>
          <p className="mt-1 text-sm font-semibold">{WASTE_SIZES.find((s) => s.id === b.waste_size)?.label} · {b.municipality}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {b.address}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{b.amount_ghs > 0 ? ghs(b.amount_ghs) : 'Plan'}</p>
          <p className="text-[11px] text-muted-foreground">{timeAgo(b.created_at)}</p>
        </div>
      </div>

      {!compact && <div className="my-4"><StatusTimeline status={b.status} /></div>}

      {b.driver && b.status !== 'pending' && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/60 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><DriverIcon className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">{b.driver.full_name} <span className="text-xs font-normal text-muted-foreground">· {b.driver.rating?.toFixed(1)} ★</span></p>
            <p className="text-xs text-muted-foreground">{b.driver.vehicle_type} · {b.driver.vehicle_plate}</p>
          </div>
          {b.driver.phone && (
            <a href={`tel:${b.driver.phone.replace(/\s/g, '')}`} className="text-xs font-semibold text-primary hover:underline">Call</a>
          )}
        </div>
      )}

      {(b.status === 'pending' || b.status === 'assigned') && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2">
          <span className="text-xs text-muted-foreground">Pickup code</span>
          <span className="font-mono text-lg font-bold tracking-widest text-primary">{b.pickup_code}</span>
        </div>
      )}

      {b.status === 'verified' && b.verification && (
        <div className="mt-3 rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Proof of disposal
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <div><Ticket className="mb-0.5 h-3 w-3" /> {b.verification.site_ticket}</div>
            <div>{b.verification.site?.name ?? 'Approved site'}</div>
            <div>{num(b.verification.weight_kg, 1)} kg disposed</div>
            <div>{b.verification.recyclables_kg > 0 ? `${num(b.verification.recyclables_kg, 1)} kg recycled` : 'No recyclables'}</div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Verified {timeAgo(b.verification.created_at)} · GPS geofence + photo + site ticket</p>
        </div>
      )}

      {(b.status === 'pending' || b.status === 'assigned') && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-destructive hover:text-destructive" onClick={cancel} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

function ReceiptRow({ booking: b }: { booking: Booking }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><ShieldCheck className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{WASTE_SIZES.find((s) => s.id === b.waste_size)?.label} · {b.reference}</p>
        <p className="truncate text-xs text-muted-foreground">
          {b.verification?.site?.name ?? 'Approved site'} · {num(b.verification?.weight_kg ?? b.estimated_kg, 0)} kg · {timeAgo(b.verified_at ?? b.created_at)}
        </p>
      </div>
      <span className="text-xs font-semibold text-emerald-600">{b.verification?.site_ticket}</span>
    </div>
  )
}

/* ---------------- Book dialog ---------------- */

function BookDialog({
  open,
  onOpenChange,
  profile,
  planCredits,
  onBooked,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  profile: { municipality: string | null; address: string | null; wallet_balance: number }
  planCredits: number
  onBooked: () => void
}) {
  const [size, setSize] = useState<WasteSize>('standard_bin')
  const [time, setTime] = useState<PreferredTime>('now')
  const [usePlan, setUsePlan] = useState(planCredits > 0)
  const [address, setAddress] = useState(profile.address ?? '')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Booking | null>(null)

  useEffect(() => {
    if (open) {
      setCreated(null)
      setAddress(profile.address ?? '')
      setUsePlan(planCredits > 0)
    }
  }, [open, profile.address, planCredits])

  const price = usePlan ? 0 : WASTE_SIZES.find((s) => s.id === size)!.estKg ? ({ small_sack: 6, standard_bin: 12, bulky: 25 } as Record<string, number>)[size] : 12

  async function submit() {
    setBusy(true)
    try {
      const res = await api<{ booking: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ wasteSize: size, preferredTime: time, notes, usePlan, address }),
      })
      setCreated(res.booking)
      onBooked()
      toast.success('Pickup requested! Share the code with your operator.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto scroll-slim">
        {created ? (
          <div className="py-4 text-center">
            <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <BadgeCheck className="h-8 w-8" />
            </span>
            <DialogHeader className="items-center">
              <DialogTitle className="font-display text-2xl">Pickup requested!</DialogTitle>
              <DialogDescription>
                Nearest vetted operator is being matched. This usually takes minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="mx-auto mt-4 w-fit rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-6 py-3">
              <p className="text-xs text-muted-foreground">Show this code on arrival</p>
              <p className="font-mono text-3xl font-bold tracking-[0.3em] text-primary">{created.pickup_code}</p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Ref {created.reference} · {created.amount_ghs > 0 ? ghs(created.amount_ghs) + ' paid from wallet' : 'plan credit used'}</p>
            <Button className="mt-5 w-full" onClick={() => onOpenChange(false)}>Done — track in My Bookings</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Book a pickup</DialogTitle>
              <DialogDescription>Vetted operator · fixed tariff · verified disposal</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {WASTE_SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSize(s.id)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition-colors',
                      size === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    )}
                  >
                    <Package className={cn('mb-1 h-4 w-4', size === s.id ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="text-sm font-semibold leading-tight">{s.label}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{s.hint}</p>
                    <p className="mt-1 text-xs font-bold text-primary">{ghs(({ small_sack: 6, standard_bin: 12, bulky: 25 } as Record<string, number>)[s.id])}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>When?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['now', 'today', 'tomorrow'] as PreferredTime[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className={cn(
                        'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium capitalize transition-colors',
                        time === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Clock3 className="h-3.5 w-3.5" /> {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-addr">Pickup address</Label>
                <Input id="bk-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House 12, Asuoyeboah Main Road" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-notes">Notes for the operator <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bin at the side gate, blue lid…" rows={2} />
              </div>

              {planCredits > 0 && (
                <label className="flex cursor-pointer items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <BadgeCheck className="h-4 w-4 text-primary" /> Use a plan credit
                    <Badge variant="secondary" className="text-[10px]">{planCredits} left</Badge>
                  </span>
                  <input type="checkbox" checked={usePlan} onChange={(e) => setUsePlan(e.target.checked)} className="h-4 w-4 accent-[color:var(--primary)]" />
                </label>
              )}

              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-xl font-bold">{usePlan ? 'Plan credit' : ghs(price)}</span>
              </div>
              {!usePlan && price > profile.wallet_balance && (
                <p className="rounded-lg bg-destructive/10 p-2 text-center text-xs font-medium text-destructive">
                  Balance too low — top up GHS {(price - profile.wallet_balance).toFixed(2)} in the Wallet tab first.
                </p>
              )}
              <Button className="h-12 w-full text-base" onClick={submit} disabled={busy || !address.trim() || (!usePlan && price > profile.wallet_balance)}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm booking'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Top-up dialog ---------------- */

function TopUpDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [amount, setAmount] = useState(50)
  const [network, setNetwork] = useState(MOMO_NETWORKS[0])
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await api('/api/wallet', { method: 'POST', body: JSON.stringify({ action: 'topup', amount, network }) })
      toast.success(`GHS ${amount} added via ${network}`)
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Top-up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Top up wallet</DialogTitle>
          <DialogDescription>MTN MoMo · Telecel Cash · AirtelTigo Money (simulated for demo)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[20, 50, 100, 200].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={cn(
                  'h-11 rounded-lg border text-sm font-bold transition-colors',
                  amount === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="top-amount">Amount (GHS)</Label>
            <Input id="top-amount" type="number" min={5} max={2000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile money network</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOMO_NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="h-12 w-full text-base" onClick={submit} disabled={busy || amount < 5}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay ${ghs(amount)} with ${network}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Plan subscribe button ---------------- */

function PlanButton({ planId, planName, price, isCurrent, balance, onDone }: { planId: string; planName: string; price: number; isCurrent: boolean; balance: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const blocked = !isCurrent && balance < price

  async function subscribe() {
    setBusy(true)
    try {
      await api('/api/wallet', { method: 'POST', body: JSON.stringify({ action: 'subscribe', planId }) })
      toast.success(`${planName} activated!`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not activate plan')
    } finally {
      setBusy(false)
    }
  }

  if (isCurrent) {
    return <Button variant="secondary" className="w-full" disabled>Active on this plan</Button>
  }
  return (
    <Button className="w-full" variant={blocked ? 'secondary' : 'default'} onClick={subscribe} disabled={busy || blocked}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : blocked ? `Top up ${ghs(price - balance)} to activate` : 'Activate plan'}
    </Button>
  )
}

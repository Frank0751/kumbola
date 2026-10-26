'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Truck, MapPin, Package, Power, ShieldCheck, Ticket, Banknote, Trophy,
  KeyRound, Navigation, Loader2, BadgeCheck, Recycle, HeartPulse, HardHat, Star, Wallet, Scale,
} from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api-client'
import { ghs, timeAgo, dateTimeShort, num } from '@/lib/format'
import { WASTE_SIZES, sizeLabel } from '@/lib/constants'
import type { DriverDashboardPayload, Booking, DisposalSite, Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

type Step = 'assigned' | 'collected' | 'done'

export function DriverApp({
  profile: initialProfile,
  onExit,
}: {
  profile: { id: string; full_name: string; role: string; vehicle_plate: string | null; is_online: boolean; rating: number; base_municipality: string | null }
  onExit: () => void
}) {
  const [data, setData] = useState<DriverDashboardPayload | null>(null)
  const [online, setOnline] = useState(initialProfile.is_online)
  const [toggling, setToggling] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api<DriverDashboardPayload>('/api/driver')
      setData(res)
    } catch {
      /* transient */
    }
  }, [])

  useEffect(() => {
    const initial = setTimeout(load, 0)
    const t = setInterval(load, 8000)
    return () => {
      clearTimeout(initial)
      clearInterval(t)
    }
  }, [load])

  async function toggleOnline(v: boolean) {
    setToggling(true)
    try {
      await api('/api/driver', { method: 'POST', body: JSON.stringify({ online: v }) })
      setOnline(v)
      toast.success(v ? 'You are online — jobs incoming 🛺' : 'You are offline. Rest well!')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change status')
    } finally {
      setToggling(false)
    }
  }

  const me = data ? null : initialProfile
  const active = data?.active ?? null
  const available = data?.available ?? []
  const verifiedToday = (data?.history ?? []).filter(
    (b) => b.status === 'verified' && b.verified_at && new Date(b.verified_at).toDateString() === new Date().toDateString()
  )
  const todayEarnings = verifiedToday.reduce((s, b) => s + b.driver_payout_ghs + (b.verification ? b.verification.recyclables_kg * 0.5 : 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader profile={{ ...initialProfile, rating: initialProfile.rating }} onExit={onExit} accent="border-gold/30 bg-gold/15 text-gold-foreground" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Online status hero */}
        <Card className={cn('mb-6 border-0 transition-colors', online ? 'bg-forest text-forest-foreground' : 'bg-muted')}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', online ? 'bg-gold text-gold-foreground' : 'bg-background/60')}>
                <Truck className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-xl font-bold">{initialProfile.full_name}</p>
                <p className="text-sm opacity-80">
                  {initialProfile.vehicle_plate} · {initialProfile.base_municipality ?? 'Greater Kumasi'} · {initialProfile.rating.toFixed(1)} ★
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{online ? 'Online — receiving jobs' : 'Offline'}</p>
                <p className="text-xs opacity-70">{data ? `${data.onlineDrivers} operators online now` : '…'}</p>
              </div>
              <Switch checked={online} onCheckedChange={toggleOnline} disabled={toggling} aria-label="Go online" className="scale-125" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="jobs">
          <TabsList className="mb-6 h-11 w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="jobs" className="gap-1.5"><Navigation className="h-4 w-4" /> Jobs</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5"><Banknote className="h-4 w-4" /> Earnings</TabsTrigger>
            <TabsTrigger value="fleet" className="gap-1.5"><BadgeCheck className="h-4 w-4" /> My benefits</TabsTrigger>
          </TabsList>

          {/* ---------------- JOBS ---------------- */}
          <TabsContent value="jobs" className="space-y-6">
            {active && <ActiveJobCard booking={active} onDone={load} />}
            {!active && online && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Available jobs near you</h2>
                  <Badge variant="secondary" className="gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> {available.length} open</Badge>
                </div>
                {!data ? (
                  <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
                ) : available.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No open jobs right now. You will hear the next one — stay online!
                  </CardContent></Card>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {available.map((b) => <AvailableJobCard key={b.id} booking={b} onAccepted={load} />)}
                  </div>
                )}
              </div>
            )}
            {!active && !online && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Power className="h-10 w-10 text-muted-foreground/50" />
                  <p className="font-display text-lg font-semibold">You are offline</p>
                  <p className="max-w-sm text-sm text-muted-foreground">Flip the switch to start receiving dispatch jobs. Drivers online average 30 platform pickups a day at GHS 2,296–3,296 monthly net.</p>
                </CardContent>
              </Card>
            )}

            {(data?.history ?? []).length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Recent jobs</CardTitle></CardHeader>
                <CardContent className="divide-y">
                  {data!.history.slice(0, 8).map((b) => (
                    <div key={b.id} className="flex items-center gap-3 py-2.5">
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', b.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                        {b.status === 'verified' ? <ShieldCheck className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{sizeLabel(b.waste_size)} · {b.municipality}</p>
                        <p className="truncate text-xs text-muted-foreground">{b.reference} · {b.customer?.full_name ?? 'Customer'} · {timeAgo(b.verified_at ?? b.created_at)}</p>
                      </div>
                      <span className={cn('text-sm font-bold tabular-nums', b.status === 'verified' ? 'text-emerald-600' : 'text-muted-foreground')}>
                        {b.status === 'verified' ? `+${ghs(b.driver_payout_ghs + (b.verification?.recyclables_kg ?? 0) * 0.5)}` : '—'}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------------- EARNINGS ---------------- */}
          <TabsContent value="earnings" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-primary/15">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Today (verified)</p>
                  <p className="font-display text-3xl font-bold tabular-nums">{ghs(todayEarnings)}</p>
                  <p className="text-xs text-muted-foreground">{verifiedToday.length} job{verifiedToday.length === 1 ? '' : 's'} completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total earnings</p>
                  <p className="font-display text-3xl font-bold tabular-nums">{data ? ghs(data.leaderboard.find((l) => l.id === initialProfile.id)?.total_earnings ?? 0) : '—'}</p>
                  <p className="text-xs text-muted-foreground">{data?.history.filter((h) => h.status === 'verified').length ?? 0} verified jobs all-time</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Your share</p>
                  <p className="font-display text-3xl font-bold tabular-nums">85%</p>
                  <p className="text-xs text-muted-foreground">Platform commission is a transparent 15%</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-primary" /> Payout history (daily MoMo)</CardTitle></CardHeader>
                <CardContent className="divide-y">
                  {(!data || data.transactions.length === 0) && <p className="py-6 text-center text-sm text-muted-foreground">No payouts yet — complete your first job</p>}
                  {data?.transactions.slice(0, 10).map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', t.type === 'bonus' ? 'bg-gold/20 text-gold-foreground' : 'bg-emerald-100 text-emerald-700')}>
                        {t.type === 'bonus' ? <Recycle className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.note ?? (t.type === 'bonus' ? 'Recyclables bonus' : 'Fare payout')}</p>
                        <p className="text-xs text-muted-foreground">{dateTimeShort(t.created_at)}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-emerald-600">+{ghs(t.amount_ghs)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-gold" /> Operator leaderboard</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(!data || data.leaderboard.length === 0) && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
                  {data?.leaderboard.map((d, i) => (
                    <div key={d.id} className={cn('flex items-center gap-3 rounded-lg p-2', d.id === initialProfile.id && 'bg-primary/5 ring-1 ring-primary/20')}>
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-gold text-gold-foreground' : 'bg-muted text-muted-foreground')}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.full_name}{d.id === initialProfile.id && ' (you)'}</p>
                        <p className="text-xs text-muted-foreground">{d.total_jobs} jobs · {d.rating.toFixed(1)} ★</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{ghs(d.total_earnings, { compact: true })}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---------------- BENEFITS ---------------- */}
          <TabsContent value="fleet" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4 text-primary" /> Lease-to-own tricycle fund</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress to ownership</span>
                  <span className="font-bold">GHS 12,400 / 36,000</span>
                </div>
                <Progress value={34} className="h-3" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Every verified job grows your equity. Own your Aboboyaa after 24 months of GHS 1,500/month contributions.
                </p>
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-3">
              <BenefitCard icon={BadgeCheck} title="L.I. 2519 licence" body={initialProfile.vehicle_plate ? 'DVLA registration supported' : 'Onboarding in progress'} ok={!!initialProfile.vehicle_plate} />
              <BenefitCard icon={HardHat} title="PPE kit" body="Helmet, vest, gloves & boots issued" ok />
              <BenefitCard icon={HeartPulse} title="NHIS & screening" body="Annual health screening covered" ok />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">How your pay works</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between"><span>Fare (85% share)</span><span className="font-semibold text-foreground">GHS 254.11/day avg</span></div>
                <div className="flex justify-between"><span>Recyclables bonus</span><span className="font-semibold text-foreground">+ GHS 0.50/kg</span></div>
                <div className="flex justify-between"><span>Fuel, tolls & maintenance</span><span className="font-semibold text-foreground">− GHS 114.87/day avg</span></div>
                <Separator />
                <div className="flex justify-between"><span className="font-semibold text-foreground">Net daily earnings</span><span className="font-display text-lg font-bold text-primary">GHS 126.75</span></div>
                <p className="pt-1 text-xs">Payouts land on your mobile money the same day each load is verified. Random audits keep the marketplace fair for everyone.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      {me && null}
    </div>
  )
}

function BenefitCard({ icon: Icon, title, body, ok }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; ok?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <span className={cn('mb-2 flex h-10 w-10 items-center justify-center rounded-xl', ok ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}

/* ---------------- Available job card ---------------- */

function AvailableJobCard({ booking: b, onAccepted }: { booking: Booking; onAccepted: () => void }) {
  const [busy, setBusy] = useState(false)
  const payout = b.driver_payout_ghs

  async function accept() {
    setBusy(true)
    try {
      await api('/api/bookings/actions', { method: 'POST', body: JSON.stringify({ bookingId: b.id, action: 'accept' }) })
      toast.success('Job accepted — head to the pickup point!')
      onAccepted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept job')
      onAccepted()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{sizeLabel(b.waste_size)} · {b.municipality}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /> {b.address}</p>
            {b.notes && <p className="mt-0.5 line-clamp-1 text-xs italic text-muted-foreground">“{b.notes}”</p>}
          </div>
          <Badge variant="secondary" className="shrink-0">{b.preferred_time === 'now' ? 'ASAP' : b.preferred_time}</Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Est. {num(b.estimated_kg, 0)} kg · {timeAgo(b.created_at)}</span>
          <span className="font-display text-lg font-bold text-primary">+{ghs(payout)}</span>
        </div>
        <Button className="h-11 w-full" onClick={accept} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept job'}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ---------------- Active job flow ---------------- */

function ActiveJobCard({ booking: b, onDone }: { booking: Booking; onDone: () => void }) {
  const step: Step = b.status === 'assigned' ? 'assigned' : b.status === 'collected' ? 'collected' : 'done'
  return (
    <Card className="border-primary/25 shadow-md">
      <CardHeader className="flex-row items-center justify-between border-b bg-primary/5 pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Navigation className="h-5 w-5 text-primary" /> Active job · {b.reference}
        </CardTitle>
        <Badge className="bg-primary text-primary-foreground">{step === 'assigned' ? '1 · Pick up' : step === 'collected' ? '2 · Verify disposal' : 'Done'}</Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pickup</p>
            <p className="font-semibold">{b.customer?.full_name ?? 'Customer'}{b.customer?.phone ? ` · ${b.customer.phone}` : ''}</p>
            <p className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {b.address}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary">{sizeLabel(b.waste_size)}</Badge>
              <Badge variant="secondary">≈ {num(b.estimated_kg, 0)} kg</Badge>
              <Badge className="bg-primary text-primary-foreground">You earn {ghs(b.driver_payout_ghs)}</Badge>
            </div>
          </div>
          {step === 'assigned' && <CollectStep booking={b} onDone={onDone} />}
          {step === 'collected' && <VerifyStep booking={b} onDone={onDone} />}
        </div>
      </CardContent>
    </Card>
  )
}

function CollectStep({ booking: b, onDone }: { booking: Booking; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await api('/api/bookings/actions', { method: 'POST', body: JSON.stringify({ bookingId: b.id, action: 'collect', code }) })
      toast.success('Pickup confirmed — now head to an approved site')
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm pickup')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-primary/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-primary" /> Ask the customer for their 4-digit pickup code</p>
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="h-12 text-center font-mono text-2xl tracking-[0.4em]"
          aria-label="Pickup code"
        />
      </div>
      <Button className="h-12 w-full text-base" onClick={submit} disabled={busy || code.length !== 4}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm collection'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Collection is only counted when the code matches — protects you and the customer.</p>
    </div>
  )
}

function VerifyStep({ booking: b, onDone }: { booking: Booking; onDone: () => void }) {
  const [sites, setSites] = useState<DisposalSite[]>([])
  const [siteId, setSiteId] = useState('')
  const [weight, setWeight] = useState(String(b.estimated_kg))
  const [recyclables, setRecyclables] = useState('0')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api<{ sites: DisposalSite[] }>('/api/data')
      .then((res) => {
        setSites(res.sites)
        setSiteId(res.sites[0]?.id ?? '')
      })
      .catch(() => {})
  }, [])

  const bonus = Number(((Number(recyclables) || 0) * 0.5).toFixed(2))

  async function submit() {
    setBusy(true)
    try {
      const res = await api<{ verification: { site_ticket: string } }>('/api/bookings/actions', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: b.id,
          action: 'verify',
          siteId,
          weightKg: Number(weight),
          recyclablesKg: Number(recyclables) || 0,
        }),
      })
      setDone(true)
      toast.success(`Disposal verified! Payout + bonus on the way · Ticket ${res.verification.site_ticket}`)
      setTimeout(onDone, 1600)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-emerald-50 p-6 text-center dark:bg-emerald-950/30">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white"><ShieldCheck className="h-7 w-7" /></span>
        <p className="font-display text-lg font-bold text-emerald-700 dark:text-emerald-400">Disposal verified 🌍</p>
        <p className="text-sm text-muted-foreground">Geofence ✓ · Photo ✓ · Site ticket ✓</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Proof of disposal — finish the job here</p>
      <div className="space-y-1.5">
        <Label>Approved disposal site</Label>
        <Select value={siteId} onValueChange={setSiteId}>
          <SelectTrigger><SelectValue placeholder="Choose site" /></SelectTrigger>
          <SelectContent>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} · {s.type.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="w" className="flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> Weight (kg)</Label>
          <Input id="w" type="number" min={1} value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r" className="flex items-center gap-1"><Recycle className="h-3.5 w-3.5" /> Recyclables (kg)</Label>
          <Input id="r" type="number" min={0} value={recyclables} onChange={(e) => setRecyclables(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-gold/10 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Payout on verification</span>
        <span className="font-display text-lg font-bold">{ghs(b.driver_payout_ghs + bonus)}{bonus > 0 && <span className="text-xs font-normal text-muted-foreground"> (incl. {ghs(bonus)} bonus)</span>}</span>
      </div>
      <Button className="h-12 w-full text-base" onClick={submit} disabled={busy || !siteId}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify at site (GPS + photo)'}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        GPS geofence arrival, timestamped photo and the site ticket are recorded automatically. Fraud = clawback + suspension.
      </p>
    </div>
  )
}

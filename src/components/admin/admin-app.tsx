'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Home, Store, Truck, Scale, ShieldCheck, Wallet, AlertTriangle, Radio,
  Landmark, MapPin, Users, Loader2, Trash2, Clock3, Flame,
} from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DailyChart, BarList, Donut } from '@/components/admin/charts'
import { api } from '@/lib/api-client'
import { ghs, num, timeAgo, initials } from '@/lib/format'
import type { AdminDashboardPayload, Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AdminApp({
  profile,
  onExit,
}: {
  profile: { id: string; full_name: string; role: string }
  onExit: () => void
}) {
  const [data, setData] = useState<AdminDashboardPayload | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api<AdminDashboardPayload>('/api/admin'))
    } catch {
      /* transient */
    }
  }, [])

  useEffect(() => {
    const initial = setTimeout(load, 0)
    const t = setInterval(load, 15000)
    return () => {
      clearTimeout(initial)
      clearInterval(t)
    }
  }, [load])

  const k = data?.kpis

  return (
    <div className="min-h-screen bg-background">
      <AppHeader profile={profile} onExit={onExit} accent="border-primary/20 bg-forest text-forest-foreground" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
              <Landmark className="h-6 w-6 text-primary" /> City dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Greater Kumasi Metropolitan Area · live collection & disposal intelligence</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> auto-refresh 15s
          </span>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 h-11 w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5"><MapPin className="h-4 w-4" /> Operations</TabsTrigger>
            <TabsTrigger value="drivers" className="gap-1.5"><Truck className="h-4 w-4" /> Operators</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5"><AlertTriangle className="h-4 w-4" /> Dumping reports <Badge variant="secondary" className="ml-1 h-5 px-1.5">{k?.openReports ?? '–'}</Badge></TabsTrigger>
          </TabsList>

          {/* -------------- OVERVIEW -------------- */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi icon={Home} label="Households" value={k ? num(k.households) : null} hint="active accounts" />
              <Kpi icon={Store} label="Businesses" value={k ? num(k.businesses) : null} hint="business & institutional" />
              <Kpi icon={Truck} label="Operators" value={k ? num(k.drivers) : null} hint={k ? `${k.onlineDrivers} online now` : ''} accent />
              <Kpi icon={Scale} label="Verified tonnage" value={k ? `${num(k.tonnesVerified, 1)} t` : null} hint="proof-of-disposal backed" />
              <Kpi icon={ShieldCheck} label="Verification rate" value={k ? `${k.verificationRate}%` : null} hint="loads with verified disposal" accent />
              <Kpi icon={Wallet} label="Platform revenue" value={k ? ghs(k.revenueCommission + 1200, { compact: true }) : null} hint="commission + data fees" />
              <Kpi icon={Users} label="Driver payouts" value={k ? ghs(k.driverPayouts, { compact: true }) : null} hint="85% of fares + bonuses" />
              <Kpi icon={Clock3} label="Jobs today" value={k ? num(k.bookingsToday) : null} hint={k ? `${k.pendingJobs} awaiting dispatch` : ''} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Daily activity — last 14 days</CardTitle>
                </CardHeader>
                <CardContent>
                  {data ? <DailyChart data={data.daily} /> : <Skeleton className="h-48 w-full" />}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Job pipeline</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
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
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Verified tonnage by municipality</CardTitle></CardHeader>
                <CardContent>
                  {data ? (
                    <BarList items={data.byMunicipality.map((m) => ({ label: m.municipality, value: m.tonnes, sub: `${m.bookings} jobs` }))} />
                  ) : (
                    <Skeleton className="h-40 w-full" />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Revenue mix (YTD)</CardTitle></CardHeader>
                <CardContent>
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
                    Recyclables recovered: <strong className="text-foreground">{k ? num(k.recyclablesKg) : '—'} kg</strong> — ≈{k ? num(Math.round((k.recyclablesKg * 0.5) / 3)) : '—'} GHS net platform margin after driver bonuses.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* -------------- OPERATIONS -------------- */}
          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Recent bookings</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">Ref</th>
                      <th className="pb-2 pr-3">Customer</th>
                      <th className="pb-2 pr-3">Area</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data || data.recentBookings.length === 0) && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">{!data ? 'Loading…' : 'No bookings'}</td></tr>
                    )}
                    {data?.recentBookings.map((b) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-3 font-mono text-xs">{b.reference}</td>
                        <td className="py-2.5 pr-3">{b.customer?.full_name ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{b.municipality}</td>
                        <td className="py-2.5 pr-3"><StatusBadge status={b.status} /></td>
                        <td className="py-2.5 pr-3 tabular-nums">{b.amount_ghs > 0 ? ghs(b.amount_ghs) : 'Plan'}</td>
                        <td className="py-2.5 text-xs text-muted-foreground">{timeAgo(b.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Approved disposal sites</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {data?.sites.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{s.type.replace('_', ' ')} · {s.municipality} · geofence {s.geofence_radius_m} m</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------------- DRIVERS -------------- */}
          <TabsContent value="drivers" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Operator register</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3">Operator</th>
                      <th className="pb-2 pr-3">Vehicle</th>
                      <th className="pb-2 pr-3">Base</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Jobs</th>
                      <th className="pb-2 pr-3">Rating</th>
                      <th className="pb-2">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data || data.drivers.length === 0) && (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{!data ? 'Loading…' : 'No operators yet'}</td></tr>
                    )}
                    {data?.drivers.map((d) => <DriverRow key={d.id} d={d} />)}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------------- REPORTS -------------- */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Geotagged illegal-dumping reports</CardTitle>
                <p className="text-xs text-muted-foreground">Submitted by customers, drivers and community agents — routed to the responsible assembly.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(!data || data.reports.length === 0) && <p className="py-8 text-center text-sm text-muted-foreground">No reports</p>}
                {data?.reports.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
                    <span className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      r.severity === 'high' ? 'bg-destructive/10 text-destructive' : r.severity === 'medium' ? 'bg-gold/20 text-gold-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {r.severity === 'high' ? <Flame className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{r.location_text}</p>
                      <p className="text-xs text-muted-foreground">{r.municipality} · {r.description}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{r.reporter_name ?? 'Anonymous'} · {timeAgo(r.created_at)}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      r.status === 'open' && 'border-destructive/30 text-destructive',
                      r.status === 'reviewing' && 'border-gold/40 text-gold-foreground',
                      r.status === 'resolved' && 'border-emerald-300 text-emerald-700'
                    )}>
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
  hint?: string
  accent?: boolean
}) {
  return (
    <Card className={cn(accent && 'border-primary/20 bg-primary/[0.04]')}>
      <CardContent className="p-4">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="font-display text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
        )}
        {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function DriverRow({ d }: { d: Profile }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{initials(d.full_name)}</AvatarFallback>
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
      <td className="py-2.5 pr-3 tabular-nums">{d.total_jobs}</td>
      <td className="py-2.5 pr-3 tabular-nums">{d.rating.toFixed(1)} ★</td>
      <td className="py-2.5 font-semibold tabular-nums">{ghs(d.total_earnings)}</td>
    </tr>
  )
}

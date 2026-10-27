'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BadgePercent,
  Check,
  ClipboardCheck,
  KeyRound,
  Leaf,
  MapPin,
  Recycle,
  ShieldCheck,
  Siren,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/brand/logo'
import { useMarketingCta } from '@/components/marketing/marketing-shell'
import { Reveal } from './motion'

/* ------------------------------------------------------------------ */
/* For drivers (dark)                                                  */
/* ------------------------------------------------------------------ */

const DRIVER_BENEFITS: { icon: LucideIcon; text: string }[] = [
  { icon: BadgePercent, text: 'Transparent 15% commission — you keep 85% of every fare' },
  { icon: Wallet, text: 'Daily mobile money payouts — no week-long waits' },
  { icon: Recycle, text: 'Recyclables bonus — GHS 0.50 per kg for clean segregated loads' },
  { icon: KeyRound, text: 'Lease-to-own tricycles — own your vehicle over 24 months' },
  { icon: ClipboardCheck, text: 'Licensing support under L.I. 2519, PPE kit, health screening & NHIS' },
  { icon: Siren, text: 'Hour caps, rest prompts and an SOS button — your safety first' },
]

export function DriversSection() {
  const { onGetStarted } = useMarketingCta()

  return (
    <section
      id="drivers"
      aria-labelledby="drivers-title"
      className="scroll-mt-20 bg-forest text-forest-foreground bg-dots py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
        {/* Copy + benefits */}
        <Reveal>
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">
              <span aria-hidden className="size-1.5 rounded-full bg-gold" />
              For operators
            </p>
            <h2
              id="drivers-title"
              className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Own a tricycle? Turn trips into a proper living.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
              Kumasi’s Aboboyaa operators keep 85% of every fare, are paid by
              mobile money the same day, and earn a bonus for every kilogram of
              clean recyclables. Platform-only benefits exist because we studied
              what makes drivers quit other apps.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {DRIVER_BENEFITS.map((benefit) => (
                <li key={benefit.text} className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream/10 text-gold">
                    <benefit.icon className="size-5" aria-hidden />
                  </span>
                  <span className="pt-1 text-sm leading-snug text-cream/85">
                    {benefit.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Earnings card */}
        <Reveal delay={0.15}>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
            <p className="text-sm font-medium text-cream/70">
              Typical monthly net earnings
            </p>
            <p className="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums text-gold sm:text-5xl">
              GHS 2,296–3,296
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-forest/70 p-4 ring-1 ring-white/10">
                <p className="font-display text-2xl font-bold tabular-nums text-gold sm:text-3xl">
                  5.8×
                </p>
                <p className="mt-1 text-xs leading-snug text-cream/70">
                  the national minimum wage
                </p>
              </div>
              <div className="rounded-2xl bg-forest/70 p-4 ring-1 ring-white/10">
                <p className="font-display text-2xl font-bold tabular-nums text-gold sm:text-3xl">
                  127
                </p>
                <p className="mt-1 text-xs leading-snug text-cream/70">
                  operator livelihoods by month 36
                </p>
              </div>
            </div>

            <Button
              onClick={() => onGetStarted('driver')}
              className="mt-6 h-12 w-full bg-gold text-base font-semibold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90"
            >
              Drive with KumBola
            </Button>
            <p className="mt-3 text-center text-xs text-cream/60">
              Paid same-day by mobile money · verified jobs only
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Proof of disposal / city (light, two-column)                        */
/* ------------------------------------------------------------------ */

const CITY_CHIPS: { icon: LucideIcon; label: string }[] = [
  { icon: MapPin, label: '4 assemblies targeted' },
  { icon: ShieldCheck, label: '26,195 t verified disposal by month 36' },
  { icon: Recycle, label: '1,478 t recyclables recovered' },
  { icon: Leaf, label: '≈2,619 tCO2e avoided' },
]

const WEEK_TONNAGE = [38, 52, 45, 66, 58, 78, 100]
const HEAT_LEVELS = [
  'bg-primary/10',
  'bg-primary/25',
  'bg-gold/40',
  'bg-gold/75',
] as const

const PROOF_POINTS = ['Geofence arrival', 'Unload photo', 'Site ticket']

function CityDashboardMock() {
  return (
    <div className="rounded-3xl bg-forest p-5 text-forest-foreground shadow-2xl ring-1 ring-black/10 sm:p-6">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold">City dashboard</p>
            <p className="text-xs text-cream/60">Suame pilot · assemblies view</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-gold" />
          Live
        </span>
      </div>

      {/* stat tiles */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { value: '312 t', label: 'this week' },
          { value: '1,204', label: 'jobs verified' },
          { value: '97.4%', label: 'proof rate' },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <p className="font-display text-lg font-bold tabular-nums text-gold sm:text-xl">
              {tile.value}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-cream/60">
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {/* weekly tonnage bars */}
      <div className="mt-4 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
        <p className="text-xs font-medium text-cream/60">Tonnage by week</p>
        <div className="mt-3 flex h-24 items-end gap-2">
          {WEEK_TONNAGE.map((height, i) => (
            <div
              key={i}
              style={{ height: `${height}%` }}
              aria-hidden
              className={`flex-1 rounded-t-sm ${
                i === WEEK_TONNAGE.length - 1 ? 'bg-gold' : 'bg-primary/80'
              }`}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="mt-2 flex justify-between text-[10px] text-cream/50"
        >
          {WEEK_TONNAGE.map((_, i) => (
            <span key={i} className="flex-1 text-center">
              W{i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* collection heatmap */}
      <div className="mt-4 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
        <p className="text-xs font-medium text-cream/60">
          Collection heatmap — Suame
        </p>
        <div aria-hidden className="mt-3 grid grid-cols-8 gap-1.5">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className={`aspect-square rounded-[4px] ${
                HEAT_LEVELS[(i * 7 + 3) % HEAT_LEVELS.length]
              }`}
            />
          ))}
        </div>
      </div>

      {/* proof points */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-cream/60">
        {PROOF_POINTS.map((point) => (
          <li key={point} className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-gold" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CitySection() {
  return (
    <section
      id="city"
      aria-labelledby="city-title"
      className="scroll-mt-20 bg-background py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10">
        <Reveal>
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <span aria-hidden className="size-1.5 rounded-full bg-gold" />
              For the city
            </p>
            <h2
              id="city-title"
              className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Every cedi proves where waste went
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              KumBola is not just a convenience app. Geofenced GPS arrival, a
              timestamped unload photo and the site ticket close every job.
              Random audits and GPS-spoofing checks deter fraud. Assemblies get a
              free live dashboard: collection heatmaps, tonnages by area,
              disposal-site usage and geotagged illegal-dumping reports.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We work with KMA and the Suame, Kwabre East and Oforikrom
              assemblies as MoU partners — and the platform is built to serve
              any municipality that comes on board.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2.5">
              {CITY_CHIPS.map((chip) => (
                <li
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-2 text-sm font-medium text-foreground/85 shadow-sm"
                >
                  <chip.icon className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="tabular-nums">{chip.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mx-auto w-full max-w-lg lg:max-w-none">
            <CityDashboardMock />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Impact strip (gold band)                                            */
/* ------------------------------------------------------------------ */

const IMPACT_STATS = [
  { value: '20,000', label: 'households' },
  { value: '72,000', label: 'people' },
  { value: '600', label: 'businesses' },
  { value: '127', label: 'operators' },
  { value: 'GHS 11.6m', label: 'to operators' },
] as const

export function ImpactStrip() {
  return (
    <section aria-label="36-month impact targets" className="bg-accent text-accent-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-14">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {IMPACT_STATS.map((stat) => (
            <li key={stat.label} className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight tabular-nums md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-medium opacity-80">{stat.label}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-xs opacity-75">
          36-month targets from the KumBola grant proposal.
        </p>
      </div>
    </section>
  )
}

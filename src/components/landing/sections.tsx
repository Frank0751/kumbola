'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Check,
  CircleDot,
  Handshake,
  Radar,
  ShieldCheck,
  Smartphone,
  Trash2,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DIFFERENTIATORS, HOW_IT_WORKS, PLAN_CARDS, PROBLEM_STATS } from '@/lib/constants'
import { useMarketingCta } from '@/components/marketing/marketing-shell'
import { Reveal } from './motion'

/** Small gold-dot eyebrow used above section headings. */
function Eyebrow({ children, center }: { children: string; center?: boolean }) {
  return (
    <p
      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary ${
        center ? 'justify-center' : ''
      }`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-gold" />
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ */
/* Problem                                                             */
/* ------------------------------------------------------------------ */

export function ProblemSection() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-title"
      className="scroll-mt-20 bg-background py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow center>The problem</Eyebrow>
          <h2
            id="problem-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Greater Kumasi has a waste emergency
          </h2>
          <p className="mx-auto mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            The city generates about 2,000 tonnes of solid waste every day, the
            Oti landfill is near capacity, and the tricycles that already move
            most household waste work informally — unbookable, unverified,
            unprotected.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEM_STATS.map((stat, i) => (
            <Reveal key={stat.value} delay={i * 0.07} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border bg-card p-6 text-center shadow-sm">
                <p className="font-display text-4xl font-bold tracking-tight tabular-nums text-primary">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-medium leading-snug text-foreground/90">
                  {stat.label}
                </p>
                <p className="mt-auto pt-3 text-xs italic text-muted-foreground">
                  {stat.source}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

const STEP_ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  radar: Radar,
  'trash-2': Trash2,
  'shield-check': ShieldCheck,
  wallet: Wallet,
}

export function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-20 bg-grid-light py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow center>How it works</Eyebrow>
          <h2
            id="how-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            From full bin to verified disposal in five steps
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = STEP_ICONS[step.icon] ?? CircleDot
            return (
              <Reveal as="li" key={step.step} delay={i * 0.07} className="h-full">
                <div className="relative flex h-full flex-col rounded-2xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                  <span
                    aria-hidden
                    className="absolute right-5 top-4 font-display text-3xl font-bold text-primary/15"
                  >
                    {step.step}
                  </span>
                  <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </ol>

        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-sm italic text-muted-foreground">
            A job is not complete — and the operator is not paid — until disposal
            is verified.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

export function PlansSection() {
  const { onGetStarted } = useMarketingCta()

  return (
    <section
      id="plans"
      aria-labelledby="plans-title"
      className="scroll-mt-20 bg-secondary py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow center>Plans</Eyebrow>
          <h2
            id="plans-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Simple plans, honest prices
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            The blended household tariff is{' '}
            <span className="font-semibold tabular-nums text-foreground">
              GHS 41.60
            </span>{' '}
            a month — about 65% below app-based pricing in Accra.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_CARDS.map((plan, i) => {
            const popular = plan.badge === 'Most popular'
            return (
              <Reveal key={plan.id} delay={(i % 3) * 0.07} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-2xl border bg-card p-6 text-center shadow-sm ${
                    popular ? 'border-transparent ring-2 ring-primary' : ''
                  }`}
                >
                  {plan.badge && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-transparent bg-gold text-gold-foreground shadow-sm">
                      {plan.badge}
                    </Badge>
                  )}

                  <h3 className="font-display text-xl font-semibold">{plan.name}</h3>

                  <p className="mt-3">
                    <span className="font-display text-4xl font-bold tabular-nums">
                      GHS {plan.price.toLocaleString('en-US')}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{plan.per}</p>
                  <p className="mt-1 text-sm font-medium text-foreground/80">
                    {plan.pickups}
                  </p>

                  <ul className="mt-5 space-y-2.5 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex justify-center gap-2.5">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                        <span className="text-pretty leading-snug text-foreground/85">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <p className="text-xs text-muted-foreground">
                      For: {plan.target}
                    </p>
                    <Button
                      onClick={() => onGetStarted('customer')}
                      className="mt-4 h-11 w-full"
                    >
                      Choose this plan
                    </Button>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Why KumBola (differentiators)                                       */
/* ------------------------------------------------------------------ */

const DIFF_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  'shield-check': ShieldCheck,
  handshake: Handshake,
  wallet: Wallet,
  users: Users,
  'bar-chart-3': BarChart3,
}

export function DifferentiatorsSection() {
  return (
    <section
      aria-labelledby="why-title"
      className="bg-background py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow center>Why KumBola</Eyebrow>
          <h2
            id="why-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Built differently, on purpose
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            An independent platform — built by KoomBei Digital × WasteCure with
            KMA and local assemblies as partners, not bosses.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((item, i) => {
            const Icon = DIFF_ICONS[item.icon] ?? CircleDot
            return (
              <Reveal key={item.title} delay={(i % 3) * 0.07} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                  <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Curious what a pickup costs?{' '}
            <Link
              href="/plans"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              See plans &amp; pricing
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  )
}

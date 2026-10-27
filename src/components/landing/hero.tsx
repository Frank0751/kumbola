'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { HandCoins, MapPin, Percent, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PARTNERS } from '@/lib/constants'
import { useMarketingCta } from '@/components/marketing/marketing-shell'
import { Reveal } from './motion'

const TRUST_CHIPS = [
  { icon: HandCoins, label: '85% of every fare to drivers' },
  { icon: Percent, label: '15% transparent commission' },
  { icon: ShieldCheck, label: 'Proof of disposal on every job' },
] as const

export function Hero() {
  const { onGetStarted } = useMarketingCta()
  const reduce = useReducedMotion()

  const floatA = { y: reduce ? 0 : [0, -6, 0] }
  const floatB = { y: reduce ? 0 : [0, 6, 0] }

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-forest text-forest-foreground bg-dots"
    >
      {/* soft glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-1/2 h-[26rem] w-[52rem] max-w-[120vw] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 right-[-12%] h-[24rem] w-[34rem] rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:py-24 lg:grid-cols-2 lg:gap-10">
        {/* Copy */}
        <Reveal>
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-gold sm:text-sm">
              <MapPin className="size-3.5" aria-hidden />
              Greater Kumasi · Suame · Kwabre East · Oforikrom
            </span>

            <h1
              id="hero-heading"
              className="font-display text-4xl font-black leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              Kum Bola:{' '}
              <span className="text-gold">kill trash.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
              Waste collection that works like ride-hailing. Book a vetted
              Aboboyaa operator, pay by mobile money, and get GPS-verified proof
              your waste reached an approved site.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                size="lg"
                onClick={() => onGetStarted('customer')}
                className="h-12 bg-gold px-7 text-base font-semibold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90"
              >
                Book a pickup
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-cream/30 bg-transparent px-7 text-base font-semibold text-cream hover:bg-cream/10 hover:text-cream"
              >
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-cream/75">
              {TRUST_CHIPS.map((chip) => (
                <li key={chip.label} className="inline-flex items-center gap-1.5">
                  <chip.icon className="size-4 shrink-0 text-gold" aria-hidden />
                  {chip.label}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Visual */}
        <Reveal delay={0.15}>
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30 shadow-2xl ring-1 ring-white/15">
              <img
                src="/images/hero-tricycle.jpg"
                alt="Aboboyaa tricycle loaded with household waste on a busy Kumasi street"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>

            {/* floating stat card */}
            <motion.div
              aria-hidden
              animate={floatA}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6"
            >
              <div className="rounded-2xl bg-card/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur">
                <p className="font-display text-2xl font-bold tabular-nums text-primary sm:text-3xl">
                  2,000 t
                </p>
                <p className="mt-0.5 max-w-[11rem] text-xs leading-snug text-muted-foreground sm:text-sm">
                  collected city-wide every day
                </p>
              </div>
            </motion.div>

            {/* verified disposal mini-card */}
            <motion.div
              aria-hidden
              animate={floatB}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute right-4 top-4 sm:right-6 sm:top-6"
            >
              <div className="flex items-center gap-2.5 rounded-2xl bg-card/95 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="size-5 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    Verified disposal
                  </p>
                  <p className="text-xs text-muted-foreground">
                    GPS + photo confirmed
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/** Muted partner / backing row on cream. */
export function PartnerBar() {
  return (
    <section aria-label="KumBola partners" className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm font-medium text-muted-foreground">
          An independent platform built by{' '}
          <span className="font-semibold text-foreground/80">
            KoomBei Digital × WasteCure
          </span>{' '}
          — working with our partners:
        </p>
        <ul className="mt-6 flex flex-wrap items-start justify-center gap-x-10 gap-y-5">
          {PARTNERS.map((partner) => (
            <li key={partner.name} className="text-center">
              <p className="font-display text-base font-semibold text-foreground/85">
                {partner.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{partner.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

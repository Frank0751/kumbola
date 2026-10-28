'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMarketingCta } from '@/components/marketing/marketing-shell'
import { USSD_CODE } from '@/lib/constants'

/**
 * Full-screen Uber/Bolt-style hero: almost no words, two actions.
 * Everything else lives in the sidebar menu.
 */
export function Hero() {
  const { onGetStarted } = useMarketingCta()
  const reduce = useReducedMotion()

  const rise = {
    opacity: reduce ? 1 : 0,
    y: reduce ? 0 : 16,
  }

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-forest text-forest-foreground"
    >
      {/* Background image + scrim */}
      <img
        src="/images/hero-tricycle.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-45"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-forest/80 via-forest/65 to-forest/90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-1/2 h-[26rem] w-[52rem] max-w-[120vw] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
      />

      {/* Content — the whole page is this */}
      <motion.div
        initial={rise}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center sm:px-6"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-gold sm:text-sm">
          <MapPin className="size-3.5" aria-hidden />
          Greater Kumasi
        </span>

        <h1
          id="hero-heading"
          className="mt-5 font-display text-5xl font-black leading-none tracking-tight sm:text-6xl md:text-7xl"
        >
          Kum<span className="text-gold">Bola</span>
        </h1>

        <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-cream/75 sm:text-lg">
          Trash pickup in minutes — pay with mobile money.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:min-w-[22rem] sm:flex-row">
          <Button
            size="lg"
            onClick={() => onGetStarted('customer')}
            className="h-14 w-full bg-gold text-base font-semibold text-gold-foreground shadow-xl shadow-gold/25 hover:bg-gold/90 sm:w-auto sm:px-10"
          >
            Book a pickup
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onGetStarted('driver')}
            className="h-14 w-full border-cream/40 bg-transparent text-base font-semibold text-cream hover:bg-cream/10 hover:text-cream sm:w-auto sm:px-10"
          >
            Drive with KumBola
          </Button>
        </div>

        <p className="mt-6 text-xs text-cream/55 sm:text-sm">
          Web app live · USSD{' '}
          <span className="font-semibold tabular-nums text-cream/75">
            {USSD_CODE}
          </span>
        </p>
      </motion.div>
    </section>
  )
}

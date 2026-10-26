'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/brand/logo'
import { FAQS, USSD_CODE } from '@/lib/constants'
import { useMarketingCta } from '@/components/marketing/marketing-shell'
import { Reveal } from './motion'

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20 bg-background py-16 md:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <span aria-hidden className="size-1.5 rounded-full bg-gold" />
            FAQ
          </p>
          <h2
            id="faq-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Questions, answered
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Everything households, businesses and operators ask before their
            first pickup.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <Accordion
            type="single"
            collapsible
            className="mt-10 rounded-2xl border bg-card px-6 shadow-sm"
          >
            {FAQS.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`}>
                <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}

export function FinalCta() {
  const { onGetStarted } = useMarketingCta()

  return (
    <section
      aria-labelledby="final-cta-title"
      className="relative overflow-hidden bg-forest text-forest-foreground bg-dots py-16 md:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[24rem] w-[46rem] max-w-[120vw] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <LogoMark className="mx-auto h-12 w-12" />
          <h2
            id="final-cta-title"
            className="mt-6 font-display text-3xl font-black tracking-tight text-balance sm:text-5xl"
          >
            Ready to <span className="text-gold">kill trash?</span>
          </h2>
          <p className="mt-4 text-base text-cream/80 sm:text-lg">
            Join Greater Kumasi’s verified collection platform today.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => onGetStarted('customer')}
              className="h-12 bg-gold px-8 text-base font-semibold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90"
            >
              Book a pickup
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onGetStarted('driver')}
              className="h-12 border-cream/30 bg-transparent px-8 text-base font-semibold text-cream hover:bg-cream/10 hover:text-cream"
            >
              Drive with KumBola
            </Button>
          </div>

          <p className="mt-6 text-sm text-cream/60">
            Web app live now · USSD{' '}
            <span className="font-semibold tabular-nums text-cream/85">
              {USSD_CODE}
            </span>{' '}
            · WhatsApp &amp; agent booking coming soon
          </p>
        </Reveal>
      </div>
    </section>
  )
}

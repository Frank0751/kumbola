import type { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PlansSection } from '@/components/landing/sections'
import { FinalCta } from '@/components/landing/faq'

export const metadata: Metadata = {
  title: 'Plans & pricing — KumBola',
  description:
    'Simple plans, honest prices: household weekly plans, compound sharing, pay-as-you-go, business and institutional zones — from GHS 6 per sack.',
}

export default function PlansPage() {
  return (
    <MarketingShell>
      <PlansSection />
      <FinalCta />
    </MarketingShell>
  )
}

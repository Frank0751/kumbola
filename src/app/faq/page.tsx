import type { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { FaqSection } from '@/components/landing/faq'
import { FinalCta } from '@/components/landing/faq'

export const metadata: Metadata = {
  title: 'FAQ — KumBola',
  description:
    'Answers on booking, payments, proof of disposal, driver earnings, service areas — and whether KumBola is a KMA project.',
}

export default function FaqPage() {
  return (
    <MarketingShell>
      <FaqSection />
      <FinalCta />
    </MarketingShell>
  )
}

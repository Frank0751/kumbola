import type { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { DifferentiatorsSection, HowItWorks } from '@/components/landing/sections'
import { FinalCta } from '@/components/landing/faq'

export const metadata: Metadata = {
  title: 'How it works — KumBola',
  description:
    'From full bin to verified disposal in five steps: book, dispatch, collect, verify disposal, pay. See why KumBola is built differently.',
}

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <HowItWorks />
      <DifferentiatorsSection />
      <FinalCta />
    </MarketingShell>
  )
}

'use client'

import { Hero, PartnerBar } from './hero'
import { ProblemSection } from './sections'
import { ImpactStrip } from './drivers'
import { FinalCta } from './faq'

/**
 * KumBola marketing home page content — rendered inside <MarketingShell> by
 * src/app/page.tsx. Deep topics (how it works, plans, drivers, city, FAQ)
 * live on their own pages, reachable from the top navigation.
 */
export function LandingHome() {
  return (
    <>
      <Hero />
      <PartnerBar />
      <ProblemSection />
      <ImpactStrip />
      <FinalCta />
    </>
  )
}

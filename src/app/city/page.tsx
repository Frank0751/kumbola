import type { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { CitySection } from '@/components/landing/drivers'
import { FinalCta } from '@/components/landing/faq'

export const metadata: Metadata = {
  title: 'For the city & assemblies — KumBola',
  description:
    'A free live city dashboard for partner assemblies: collection heatmaps, verified tonnage, disposal-site usage and geotagged dumping reports.',
}

export default function CityPage() {
  return (
    <MarketingShell>
      <CitySection />
      <FinalCta />
    </MarketingShell>
  )
}

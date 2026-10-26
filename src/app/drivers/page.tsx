import type { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { DriversSection, ImpactStrip } from '@/components/landing/drivers'
import { FinalCta } from '@/components/landing/faq'

export const metadata: Metadata = {
  title: 'Drive & earn — KumBola',
  description:
    'Own an Aboboyaa? Keep 85% of every fare, get paid by mobile money the same day, earn a recyclables bonus and lease-to-own your tricycle.',
}

export default function DriversPage() {
  return (
    <MarketingShell>
      <DriversSection />
      <ImpactStrip />
      <FinalCta />
    </MarketingShell>
  )
}

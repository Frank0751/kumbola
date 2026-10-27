import type { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { LegalContent } from '@/components/landing/legal'

export const metadata: Metadata = {
  title: 'Privacy, Terms & Grievance — KumBola',
  description:
    'How KumBola handles your data under Ghana’s Data Protection Act (Act 843), the terms of service, and how to reach our grievance channel.',
}

export default function LegalPage() {
  return (
    <MarketingShell>
      <LegalContent />
    </MarketingShell>
  )
}

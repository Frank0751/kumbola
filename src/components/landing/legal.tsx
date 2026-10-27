import { LogoMark } from '@/components/brand/logo'
import { SUPPORT_EMAIL, SUPPORT_PHONE, USSD_CODE } from '@/lib/constants'

const SECTIONS = [
  {
    id: 'privacy',
    title: 'Privacy — Data Protection Act, 2012 (Act 843)',
    intro:
      'KumBola collects only the data needed to run a reliable, verifiable waste service — and we never sell it.',
    points: [
      'What we collect: your name, phone number, email, pickup address, municipality, and (for operators) vehicle and licence details. Job records include timestamps, GPS location, disposal photos and site tickets.',
      'Why we collect it: to dispatch operators, verify disposal, process mobile-money payments, prevent fraud, and give partner assemblies anonymised, aggregate service data.',
      'Who sees it: dispatch and support staff, your assigned operator (name, address and pickup code only), and payment processors. Partner assemblies receive aggregated dashboards — never your personal identity.',
      'Your rights under Act 843: request a copy of your data, correct it, or ask us to delete your account by emailing hello@kumbola.com. We respond within 14 days.',
      'Storage: data is encrypted in transit and at rest, hosted in the EU with access controls and audit logs.',
    ],
  },
  {
    id: 'terms',
    title: 'Terms of service',
    intro:
      'The short, honest version — the full agreement is shown at sign-up and always available on request.',
    points: [
      'The service: KumBola coordinates independent, vetted Aboboyaa operators to collect household and business waste and deliver it to approved disposal sites. We are a technology and operations platform, not a municipal authority.',
      'Payments: plans are prepaid by mobile money or cash at registered agents. Wallet credit is non-transferable. One-off pickups are charged at the published tariff before dispatch.',
      'Pickup codes: every job is confirmed with a 4-digit code. Share it only with the assigned operator — it is your proof of collection.',
      'Proof of disposal: a job is complete only when GPS arrival, an unload photo and a site ticket verify delivery to an approved site. You receive a receipt for every verified job.',
      'Operator terms: operators keep 85% of every fare, paid by mobile money the same day, plus GHS 0.50 per kilogram of clean segregated recyclables. Fraudulent verification ends the partnership.',
      'Liability: we re-vet operators regularly and insure loads in transit. Report any incident within 48 hours so we can make it right.',
    ],
  },
  {
    id: 'grievance',
    title: 'Grievance channel',
    intro:
      'Something went wrong? We take every complaint seriously — here is exactly what happens.',
    points: [
      'Reach us: email hello@kumbola.com, WhatsApp +233 55 000 0000, or dial ' + USSD_CODE + ' and choose “Report a problem”.',
      'Acknowledgement: every grievance gets a ticket number within 24 hours.',
      'Resolution: our team investigates and responds within 5 working days. Payment disputes are prioritised and resolved within 48 hours.',
      'Escalation: unresolved issues are escalated to the KumBola operations lead, then to the independent KNUST evaluation team as a final check.',
      'Anonymity: operators and customers can report fraud, dumping or safety issues anonymously — retaliation is grounds for immediate removal from the platform.',
    ],
  },
] as const

export function LegalContent() {
  return (
    <div className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="text-center">
          <LogoMark className="mx-auto h-12 w-12" />
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Privacy, terms &amp; grievance
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            The plain-language version. Last updated January 2026.
          </p>
        </header>

        <div className="mt-12 space-y-10">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              aria-labelledby={`${section.id}-title`}
              className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
            >
              <h2
                id={`${section.id}-title`}
                className="font-display text-xl font-bold sm:text-2xl"
              >
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {section.intro}
              </p>
              <ul className="mt-5 space-y-3">
                {section.points.map((point) => (
                  <li
                    key={point.slice(0, 40)}
                    className="flex gap-3 text-sm leading-relaxed text-foreground/85"
                  >
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-gold"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Questions about this page? Email {SUPPORT_EMAIL} or WhatsApp{' '}
          {SUPPORT_PHONE}.
        </p>
      </div>
    </div>
  )
}

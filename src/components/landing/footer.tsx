import Link from 'next/link'
import { LogoMark } from '@/components/brand/logo'

const PRODUCT_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/plans', label: 'Plans & pricing' },
  { href: '/drivers', label: 'For drivers' },
  { href: '/city', label: 'For the city' },
  { href: '/faq', label: 'FAQ' },
] as const

const COMPANY_LINKS = [
  { href: '/', label: 'About KumBola' },
  { href: 'mailto:hello@kumbola.com', label: 'hello@kumbola.com' },
  { href: 'tel:+233550000000', label: 'WhatsApp +233 55 000 0000' },
] as const

const LEGAL_LINKS = [
  { href: '/legal', label: 'Privacy — Act 843' },
  { href: '/legal', label: 'Terms' },
  { href: '/legal', label: 'Grievance channel' },
] as const

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: ReadonlyArray<{ href: string; label: string }>
}) {
  const external = (href: string) => href.startsWith('mailto:') || href.startsWith('tel:')
  return (
    <nav aria-label={title}>
      <h3 className="text-sm font-bold uppercase tracking-widest text-cream/50">
        {title}
      </h3>
      <ul className="mt-4 space-y-1">
        {links.map((link) => (
          <li key={link.label}>
            {external(link.href) ? (
              <a
                href={link.href}
                className="inline-block py-1.5 text-sm text-cream/70 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="inline-block py-1.5 text-sm text-cream/70 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-forest text-forest-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 text-center sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center justify-center gap-3">
              <LogoMark className="h-10 w-10" />
              <span className="font-display text-xl font-bold text-cream">
                KumBola
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-gold">
              KumBola — kill trash
            </p>
            <p className="mx-auto mt-3 max-w-xs text-pretty text-sm leading-relaxed text-cream/70">
              An independent platform by KoomBei Digital × WasteCure — with KMA,
              local assemblies and operator associations as partners, for
              Greater Kumasi.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 border-t border-white/10 pt-6 text-center text-xs text-cream/60">
          <p>© 2026 KumBola Limited. Dream with us. Rise with us.</p>
          <p>Built for Greater Kumasi 🇬🇭</p>
        </div>
      </div>
    </footer>
  )
}

import Link from 'next/link'
import { LogoMark } from '@/components/brand/logo'

const FOOTER_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/plans', label: 'Plans' },
  { href: '/faq', label: 'FAQ' },
  { href: '/legal', label: 'Privacy & terms' },
] as const

/** Slim one-row footer — every other detail lives in the sidebar menu. */
export function SiteFooter() {
  return (
    <footer className="bg-forest text-forest-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:px-6 md:flex-row md:justify-between md:gap-6 md:text-left">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 shrink-0" />
          <div>
            <p className="font-display text-base font-bold text-cream">
              KumBola
            </p>
            <p className="text-xs text-cream/60">Kill trash — Greater Kumasi</p>
          </div>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="inline-block py-1 text-sm text-cream/70 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-xs text-cream/50">
          © 2026 KumBola Limited · Dream with us. Rise with us.
        </p>
      </div>
    </footer>
  )
}

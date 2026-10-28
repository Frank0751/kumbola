'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { useMarketingCta } from '@/components/marketing/marketing-shell'
import { useSession } from '@/lib/store'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/plans', label: 'Plans' },
  { href: '/drivers', label: 'For drivers' },
  { href: '/city', label: 'For the city' },
  { href: '/faq', label: 'FAQ' },
] as const

export function SiteNav() {
  const { onSignIn, onGetStarted } = useMarketingCta()
  const session = useSession((s) => s.session)
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => pathname === href

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <Link
          href="/"
          aria-label="KumBola — home"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo className="h-9 w-auto sm:h-10" />
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`inline-block rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive(link.href)
                    ? 'bg-accent/60 text-foreground'
                    : 'text-foreground/80 hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onSignIn}
            className="hidden h-10 px-4 sm:inline-flex"
          >
            {session ? 'Open app' : 'Sign in'}
          </Button>
          {/* Primary CTA — hidden below 380px so logo + hamburger fit at 320px;
              the same CTA is the first button in the mobile menu. */}
          <Button
            onClick={() => onGetStarted('customer')}
            className="hidden h-11 min-[380px]:inline-flex px-4"
          >
            Book a pickup
          </Button>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-11 lg:hidden"
                aria-expanded={open}
                aria-controls="mobile-menu"
              >
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[19rem] gap-0 sm:max-w-[19rem]"
              id="mobile-menu"
            >
              <SheetHeader>
                <SheetTitle className="font-display text-lg">KumBola</SheetTitle>
                <SheetDescription>Kill trash — Greater Kumasi</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      className={`rounded-lg px-3 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive(link.href)
                          ? 'bg-accent/60 text-foreground'
                          : 'text-foreground/85 hover:bg-accent/50 hover:text-foreground'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t p-4">
                <Button
                  className="h-11"
                  onClick={() => {
                    setOpen(false)
                    onGetStarted('customer')
                  }}
                >
                  Book a pickup
                </Button>
                <Button
                  variant="ghost"
                  className="h-11"
                  onClick={() => {
                    setOpen(false)
                    onSignIn()
                  }}
                >
                  {session ? 'Open app' : 'Sign in'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}

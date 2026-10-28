'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bike,
  Building2,
  CircleHelp,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  Route,
  ShieldCheck,
  Truck,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { useMarketingCta } from '@/components/marketing/marketing-shell'
import { useSession } from '@/lib/store'
import { SUPPORT_EMAIL, SUPPORT_PHONE, USSD_CODE } from '@/lib/constants'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const INFO_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/how-it-works', label: 'How it works', icon: Route },
  { href: '/plans', label: 'Plans & pricing', icon: Wallet },
  { href: '/drivers', label: 'For drivers', icon: Truck },
  { href: '/city', label: 'For the city', icon: Building2 },
  { href: '/faq', label: 'FAQ', icon: CircleHelp },
]

const LEGAL_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/legal', label: 'Privacy & terms', icon: ShieldCheck },
]

/** One tappable row inside the sidebar. */
function SideItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left text-[15px] font-medium transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-[18px] text-primary" aria-hidden />
      </span>
      <span className="flex-1">{label}</span>
    </button>
  )
}

function SidebarDivider() {
  return <hr className="my-3 border-border/70" aria-hidden />
}

export function SiteNav() {
  const { onSignIn, onGetStarted } = useMarketingCta()
  const session = useSession((s) => s.session)
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)
  const go = (href: string) => {
    close()
    router.push(href)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6"
      >
        <Link
          href="/"
          aria-label="KumBola — home"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo className="h-9 w-auto sm:h-10" />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onSignIn}
            className="hidden h-10 px-4 sm:inline-flex"
          >
            {session ? 'Open app' : 'Sign in'}
          </Button>
          {/* Straight-to-booking CTA. Hidden below 380px so logo + menu fit
              at 320px; the same action is the first item in the sidebar. */}
          <Button
            onClick={() => onGetStarted('customer')}
            className="hidden h-10 min-[380px]:inline-flex px-4"
          >
            Book a pickup
          </Button>

          {/* Menu — the only navigation entry on every screen size */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-11"
                aria-expanded={open}
                aria-controls="site-menu"
              >
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              id="site-menu"
              className="flex w-[20rem] flex-col gap-0 p-0 sm:max-w-[20rem]"
            >
              <SheetHeader className="space-y-0 border-b p-5 text-left">
                <SheetTitle asChild>
                  <div className="flex items-center gap-2.5">
                    <LogoMark className="h-9 w-9" />
                    <span className="font-display text-lg font-bold">KumBola</span>
                  </div>
                </SheetTitle>
                <SheetDescription className="mt-1.5">
                  Waste pickup — Greater Kumasi
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-3">
                {/* Account */}
                {session ? (
                  <div className="mx-1 mb-1 rounded-xl bg-accent/50 p-4">
                    <p className="truncate font-display text-base font-semibold">
                      {session.profile.full_name || 'Welcome'}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {session.profile.role} account
                    </p>
                    <Button
                      className="mt-3 h-10 w-full"
                      onClick={() => {
                        close()
                        onSignIn() // session exists → enters the app
                      }}
                    >
                      Open app
                    </Button>
                  </div>
                ) : (
                  <SideItem
                    icon={LogIn}
                    label="Sign in"
                    onClick={() => {
                      close()
                      onSignIn()
                    }}
                  />
                )}

                {/* Primary actions — straight to the two things that matter */}
                <SideItem
                  icon={MapPin}
                  label="Book a pickup"
                  onClick={() => {
                    close()
                    onGetStarted('customer')
                  }}
                />
                <SideItem
                  icon={Bike}
                  label="Drive with KumBola"
                  onClick={() => {
                    close()
                    onGetStarted('driver')
                  }}
                />

                <SidebarDivider />

                {/* Information */}
                {INFO_LINKS.map((link) => (
                  <SideItem
                    key={link.href}
                    icon={link.icon}
                    label={link.label}
                    onClick={() => go(link.href)}
                  />
                ))}

                <SidebarDivider />

                {LEGAL_LINKS.map((link) => (
                  <SideItem
                    key={link.href}
                    icon={link.icon}
                    label={link.label}
                    onClick={() => go(link.href)}
                  />
                ))}
              </div>

              {/* Contact footer inside the menu */}
              <div className="border-t p-4 text-xs leading-relaxed text-muted-foreground">
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  {SUPPORT_PHONE} (WhatsApp)
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-2 py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  {SUPPORT_EMAIL}
                </a>
                <p className="py-1 tabular-nums">USSD {USSD_CODE}</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}

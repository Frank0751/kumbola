'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Home, Truck, Store, Landmark, ShieldCheck, Sparkles } from 'lucide-react'
import { publicApi } from '@/lib/api-client'
import { useSession } from '@/lib/store'
import { MUNICIPALITY_NAMES, DEMO_ACCOUNTS } from '@/lib/constants'
import type { SessionPayload } from '@/lib/types'
import { Home as HomeIcon } from 'lucide-react'

const DEMO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  truck: Truck,
  store: Store,
  landmark: Landmark,
}

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = 'signin',
  initialRole = 'customer',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialMode?: 'signin' | 'signup'
  initialRole?: 'customer' | 'driver'
}) {
  const [tab, setTab] = useState<'signin' | 'signup'>(initialMode)
  const [role, setRole] = useState<'customer' | 'driver'>(initialRole)
  const [busy, setBusy] = useState(false)

  // Sync the tab/role the dialog was opened with (e.g. "Drive with KumBola"
  // must land on Create account → driver). useState alone would keep the
  // first-mount value forever because the dialog stays mounted in the shell.
  useEffect(() => {
    if (open) {
      setTab(initialMode)
      setRole(initialRole)
    }
  }, [open, initialMode, initialRole])
  const [demoBusy, setDemoBusy] = useState<string | null>(null)

  // shared
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  // customer
  const [accountType, setAccountType] = useState<'household' | 'business' | 'institution'>('household')
  const [municipality, setMunicipality] = useState<string>('Suame')
  const [address, setAddress] = useState('')
  // driver
  const [plate, setPlate] = useState('')

  const setMode = (m: string) => setTab(m as 'signin' | 'signup')

  async function submitSignIn(e?: React.FormEvent) {
    e?.preventDefault()
    if (!email || !password) return toast.error('Enter your email and password')
    setBusy(true)
    try {
      const res = await publicApi<{ session: SessionPayload }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'signin', email, password }),
      })
      useSession.getState().setSession(res.session)
      onOpenChange(false)
      toast.success(`Welcome back, ${res.session.profile.full_name.split(' ')[0]}!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  async function submitSignUp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!email || !password || !fullName) return toast.error('Fill in your name, email and password')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (role === 'customer' && !address.trim()) return toast.error('Enter your pickup address')
    setBusy(true)
    try {
      const res = await publicApi<{ session: SessionPayload }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'signup',
          email,
          password,
          fullName,
          phone,
          role,
          accountType: role === 'customer' ? accountType : undefined,
          municipality,
          address: role === 'customer' ? address : `${municipality} operating base`,
          vehiclePlate: role === 'driver' ? plate : undefined,
        }),
      })
      useSession.getState().setSession(res.session)
      onOpenChange(false)
      toast.success('Akwaaba! Your KumBola account is ready.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  async function demoLogin(demoEmail: string) {
    setDemoBusy(demoEmail)
    try {
      const res = await publicApi<{ session: SessionPayload }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'signin', email: demoEmail, password: 'kumbola123' }),
      })
      useSession.getState().setSession(res.session)
      onOpenChange(false)
      toast.success(`Signed in as ${res.session.profile.full_name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Demo sign in failed')
    } finally {
      setDemoBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto scroll-slim">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {tab === 'signin' ? 'Welcome back' : 'Join KumBola'}
          </DialogTitle>
          <DialogDescription>
            {tab === 'signin'
              ? 'Sign in to book pickups, drive, or manage the city dashboard.'
              : 'Reliable collection, verified disposal, fair pay — Greater Kumasi.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setMode}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          {/* ---------------- SIGN IN ---------------- */}
          <TabsContent value="signin" className="space-y-4 mt-2">
            <form onSubmit={submitSignIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
              </Button>
            </form>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover px-2 text-xs text-muted-foreground">
                or try a demo account
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((d) => {
                const Icon = DEMO_ICONS[d.icon] ?? Home
                return (
                  <button
                    key={d.email}
                    onClick={() => demoLogin(d.email)}
                    disabled={demoBusy !== null}
                    className="flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors hover:bg-muted disabled:opacity-60 min-h-[44px]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {demoBusy === d.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{d.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{d.name}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </TabsContent>

          {/* ---------------- SIGN UP ---------------- */}
          <TabsContent value="signup" className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-colors min-h-[48px] ${role === 'customer' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
              >
                <Home className="h-4 w-4" /> I need pickup
              </button>
              <button
                type="button"
                onClick={() => setRole('driver')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-colors min-h-[48px] ${role === 'driver' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
              >
                <Truck className="h-4 w-4" /> I drive a tricycle
              </button>
            </div>

            <form onSubmit={submitSignUp} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" placeholder="Ama Serwaa" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="+233 54 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass">Password</Label>
                  <Input id="su-pass" type="password" placeholder="8+ characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              {role === 'customer' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Account type</Label>
                      <Select value={accountType} onValueChange={(v) => setAccountType(v as typeof accountType)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="household">Household</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="institution">Institution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Municipality</Label>
                      <Select value={municipality} onValueChange={setMunicipality}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MUNICIPALITY_NAMES.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Pickup address</Label>
                    <Input id="address" placeholder="House 12, Asuoyeboah Main Road" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                    You start with GHS 20 free wallet credit. Plans are optional — pay-as-you-go works from day one.
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="plate">Vehicle plate</Label>
                      <Input id="plate" placeholder="AS-0000-26" value={plate} onChange={(e) => setPlate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Base municipality</Label>
                      <Select value={municipality} onValueChange={setMunicipality}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MUNICIPALITY_NAMES.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    Keep 85% of every fare. Daily MoMo payouts, licence support under L.I. 2519, PPE kit and NHIS enrolment.
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : role === 'driver' ? 'Join as operator' : 'Create my account'}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                By continuing you agree to KumBola&apos;s terms and the Data Protection Act, 2012 (Act 843) privacy notice.
              </p>
            </form>
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-[10px]">USSD {`*920*88#`} · WhatsApp booking coming soon</Badge>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

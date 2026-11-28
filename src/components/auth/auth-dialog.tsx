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
import { Loader2, Home, Truck, Store, ShieldCheck, Sparkles } from 'lucide-react'
import { publicApi } from '@/lib/api-client'
import { useSession } from '@/lib/store'
import { MUNICIPALITY_NAMES, DEMO_ACCOUNTS, USSD_CODE } from '@/lib/constants'
import type { SessionPayload } from '@/lib/types'
import { normalizePhone, PHONE_HINT } from '@/lib/phone'

type FieldId = 'email' | 'password' | 'fullName' | 'phone' | 'su-email' | 'su-pass' | 'address' | 'plate'

// The message under a field. role="alert" so it is read out when it appears.
function FieldError({ id, message }: { id: FieldId; message?: string }) {
  if (!message) return null
  return (
    <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  )
}
import { Home as HomeIcon } from 'lucide-react'

const DEMO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  truck: Truck,
  store: Store,
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

  // Field-level errors, shown under each field (not only as a passing toast).
  const [errors, setErrors] = useState<Partial<Record<FieldId, string>>>({})
  const clearError = (id: FieldId) => setErrors((prev) => (prev[id] ? { ...prev, [id]: undefined } : prev))
  // Show the errors and put the cursor in the first field that needs fixing.
  function showErrors(found: Partial<Record<FieldId, string>>, order: FieldId[]) {
    setErrors(found)
    const first = order.find((id) => found[id])
    if (first) requestAnimationFrame(() => document.getElementById(first)?.focus())
  }
  // Props that tie an input to its error message for screen readers.
  const fieldA11y = (id: FieldId) =>
    errors[id] ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {}

  async function submitSignIn(e?: React.FormEvent) {
    e?.preventDefault()
    const found: Partial<Record<FieldId, string>> = {}
    if (!email.trim()) found.email = 'Enter your email'
    if (!password) found.password = 'Enter your password'
    if (Object.keys(found).length) return showErrors(found, ['email', 'password'])
    setErrors({})
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
    const found: Partial<Record<FieldId, string>> = {}
    if (!fullName.trim()) found.fullName = 'Enter your full name'
    if (!phone.trim()) found.phone = 'Enter a phone number we can reach you on'
    else if (!normalizePhone(phone)) found.phone = PHONE_HINT
    if (!email.trim()) found['su-email'] = 'Enter your email'
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) found['su-email'] = 'Check your email address, for example ama@gmail.com'
    if (password.length < 8) found['su-pass'] = 'Use at least 8 characters'
    if (role === 'customer' && !address.trim()) found.address = 'Enter where the operator should collect from'
    if (role === 'driver' && !plate.trim()) found.plate = 'Enter your tricycle plate number'
    if (Object.keys(found).length) {
      return showErrors(found, ['fullName', 'phone', 'su-email', 'su-pass', 'address', 'plate'])
    }
    setErrors({})
    setBusy(true)
    try {
      const res = await publicApi<{ session: SessionPayload }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'signup',
          email: email.trim(),
          password,
          fullName: fullName.trim(),
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
      // Server errors keep everything the person typed; nothing is cleared.
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
              : 'Reliable collection, verified disposal, fair pay across Greater Kumasi.'}
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
                <Input id="email" type="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email') }} autoComplete="email" {...fieldA11y('email')} />
                <FieldError id="email" message={errors.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); clearError('password') }} autoComplete="current-password" {...fieldA11y('password')} />
                <FieldError id="password" message={errors.password} />
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
                    className="flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors hover:bg-muted disabled:opacity-60 min-h-[44px] last:odd:col-span-2"
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

            <form onSubmit={submitSignUp} noValidate className="space-y-3">
              {role === 'customer' && (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <Sparkles className="mr-1.5 inline h-4 w-4 align-[-3px] text-gold" aria-hidden />
                  Create your free account to book. It takes about a minute, and you start with{' '}
                  <strong className="font-semibold text-foreground">GHS 20 credit</strong>. All fields are required.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" placeholder="Ama Serwaa" value={fullName} onChange={(e) => { setFullName(e.target.value); clearError('fullName') }} autoComplete="name" autoCapitalize="words" {...fieldA11y('fullName')} />
                  <FieldError id="fullName" message={errors.fullName} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" inputMode="tel" placeholder="024 123 4567" value={phone} onChange={(e) => { setPhone(e.target.value); clearError('phone') }} autoComplete="tel" {...fieldA11y('phone')} />
                  <FieldError id="phone" message={errors.phone} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); clearError('su-email') }} autoComplete="email" {...fieldA11y('su-email')} />
                  <FieldError id="su-email" message={errors['su-email']} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass">Password</Label>
                  <Input id="su-pass" type="password" placeholder="8+ characters" value={password} onChange={(e) => { setPassword(e.target.value); clearError('su-pass') }} autoComplete="new-password" {...fieldA11y('su-pass')} />
                  <FieldError id="su-pass" message={errors['su-pass']} />
                </div>
              </div>

              {role === 'customer' ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="account-type">Account type</Label>
                      <Select value={accountType} onValueChange={(v) => setAccountType(v as typeof accountType)}>
                        <SelectTrigger id="account-type" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="household">Household</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="institution">Institution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="municipality">Municipality</Label>
                      <Select value={municipality} onValueChange={setMunicipality}>
                        <SelectTrigger id="municipality" className="w-full"><SelectValue /></SelectTrigger>
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
                    <Input id="address" placeholder="House 12, Asuoyeboah Main Road" value={address} onChange={(e) => { setAddress(e.target.value); clearError('address') }} autoComplete="street-address" {...fieldA11y('address')} />
                    <FieldError id="address" message={errors.address} />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="plate">Vehicle plate</Label>
                      <Input
                        id="plate"
                        placeholder="AS-0000-26"
                        value={plate}
                        onChange={(e) => { setPlate(e.target.value); clearError('plate') }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        enterKeyHint="next"
                        {...fieldA11y('plate')}
                      />
                      <FieldError id="plate" message={errors.plate} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="base-municipality">Base municipality</Label>
                      <Select value={municipality} onValueChange={setMunicipality}>
                        <SelectTrigger id="base-municipality" className="w-full"><SelectValue /></SelectTrigger>
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
              <p className="text-center text-xs text-muted-foreground">
                By continuing you agree to KumBola&apos;s{' '}
                <a href="/legal" target="_blank" rel="noopener" className="font-medium text-foreground underline underline-offset-2">
                  terms and privacy notice<span className="sr-only"> (opens in a new tab)</span>
                </a>{' '}
                under the Data Protection Act, 2012 (Act 843).
              </p>
            </form>
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-[11px]">USSD {USSD_CODE} and WhatsApp booking coming soon</Badge>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

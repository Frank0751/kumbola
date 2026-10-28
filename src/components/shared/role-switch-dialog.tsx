'use client'

// ============================================================
// RoleSwitchDialog — "Become an operator" flow for customer accounts.
// One account, both worlds: switch to operator mode without losing any
// customer data. If the profile already has a vehicle plate from a previous
// operator stint, switching is a single tap.
// ============================================================
import { useEffect, useState } from 'react'
import { BadgeCheck, Coins, Loader2, Truck, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'

const VEHICLE_TYPES = ['Aboboyaa 200cc', 'Aboboyaa 150cc', 'Tricycle pickup'] as const

interface RolesResponse {
  profile?: Profile
  error?: string
}

export function RoleSwitchDialog({
  open,
  onOpenChange,
  profile,
  onSwitched,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: Profile
  onSwitched: (profile: Profile) => void
}) {
  const returning = !!profile.vehicle_plate
  const [plate, setPlate] = useState('')
  const [vehicleType, setVehicleType] = useState<string>(VEHICLE_TYPES[0])
  const [base, setBase] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setPlate(profile.vehicle_plate ?? '')
      setVehicleType(profile.vehicle_type ?? VEHICLE_TYPES[0])
      setBase(profile.base_municipality ?? profile.municipality ?? '')
    }
  }, [open, profile])

  async function switchToOperator() {
    if (!plate.trim()) {
      toast.error('Enter your vehicle plate to continue')
      return
    }
    setBusy(true)
    try {
      const res = await api<RolesResponse>('/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          role: 'driver',
          vehiclePlate: plate.trim(),
          vehicleType: vehicleType,
          baseMunicipality: base.trim() || undefined,
        }),
      })
      if (res.profile) {
        onSwitched(res.profile)
        toast.success('Operator mode unlocked 🛺 — go online to start earning!')
        onOpenChange(false)
      } else {
        toast.error(res.error ?? 'Could not switch modes')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch modes')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Truck className="size-5 text-primary" />
            </span>
            {returning ? 'Welcome back, operator!' : 'Become an operator'}
          </DialogTitle>
          <DialogDescription>
            {returning
              ? 'Your operator details are saved from last time — pick up right where you left off.'
              : 'Use one account for both worlds. Your bookings, plan credits and wallet stay exactly as they are.'}
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-2 rounded-xl border bg-muted/40 p-3 text-sm">
          <li className="flex items-center gap-2">
            <Coins className="size-4 shrink-0 text-gold" aria-hidden /> Keep 85% of every fare, paid out weekly
          </li>
          <li className="flex items-center gap-2">
            <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden /> Proof-of-disposal checks build your rating
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden /> Jobs near your base municipality first
          </li>
        </ul>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="switch-plate">Vehicle plate</Label>
            <Input
              id="switch-plate"
              placeholder="e.g. AS 1234-20"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="switch-type">Vehicle type</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger id="switch-type" className="w-full">
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="switch-base">Base municipality (optional)</Label>
            <Input
              id="switch-base"
              placeholder="e.g. Suame"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={switchToOperator} disabled={busy} className="w-full h-11 font-semibold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            Switch to operator mode
          </Button>
        </DialogFooter>
        <p className="text-center text-xs text-muted-foreground">
          You can switch back to customer mode anytime from the account menu.
        </p>
      </DialogContent>
    </Dialog>
  )
}

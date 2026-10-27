'use client'

import type { BookingStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Clock, UserCheck, Truck, ShieldCheck, XCircle } from 'lucide-react'

const MAP: Record<BookingStatus, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  pending: { label: 'Finding driver', icon: Clock, className: 'bg-amber-100 text-amber-900 border-amber-200' },
  assigned: { label: 'Driver assigned', icon: UserCheck, className: 'bg-secondary text-secondary-foreground border-border' },
  collected: { label: 'Collected', icon: Truck, className: 'bg-primary/10 text-primary border-primary/20' },
  verified: { label: 'Disposal verified', icon: ShieldCheck, className: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-muted text-muted-foreground border-border' },
}

export function StatusBadge({ status, className = '' }: { status: BookingStatus; className?: string }) {
  const cfg = MAP[status] ?? MAP.pending
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={`${cfg.className} ${className} gap-1`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  )
}

export function StatusTimeline({ status }: { status: BookingStatus }) {
  const steps: { key: BookingStatus; label: string }[] = [
    { key: 'pending', label: 'Booked' },
    { key: 'assigned', label: 'Dispatched' },
    { key: 'collected', label: 'Collected' },
    { key: 'verified', label: 'Verified' },
  ]
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <XCircle className="h-4 w-4 text-destructive" /> Booking cancelled — any payment was refunded to your wallet.
      </div>
    )
  }
  const activeIndex = steps.findIndex((s) => s.key === status)
  return (
    <ol className="flex items-center w-full" aria-label="Booking progress">
      {steps.map((s, i) => {
        const done = i < activeIndex
        const current = i === activeIndex
        return (
          <li key={s.key} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  done
                    ? 'bg-primary text-primary-foreground'
                    : current
                      ? 'bg-gold text-gold-foreground ring-4 ring-gold/30'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-[10px] leading-none ${current ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className={`mx-1 mb-4 h-0.5 flex-1 rounded ${done ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

'use client'

// KumBola Command Centre — v3 tabs: Customers · Platform · Reports
// Customers: wallet adjustments, block/unblock, direct messages (spec 7/10)
// Platform:  feature flags, pricing, broadcasts, dumping triage, health (spec 11/14/20/23)
// v4 (Task 20) refactor: print CSS moved to globals (no-print fixed), semantic
// tables (caption/scope), labelled inputs and icon buttons, 4/8px spacing grid.

import { useState } from "react"
import {
  Users, Wallet, MessageSquare, Ban, ShieldCheck, FileSpreadsheet, Download, Printer,
  Megaphone, Cog, MapPin, Landmark, CreditCard, Radio, AlertTriangle, Leaf, Truck, History,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useSession } from '@/lib/store'
import { ghs, num, timeAgo, initials } from '@/lib/format'
import type { AdminDashboardPayload, Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface TabProps {
  data: AdminDashboardPayload
  busy: string | null
  act: (body: Record<string, unknown>, label: string) => Promise<boolean>
  /** only consumers that highlight a searched row pass this */
  highlightId?: string | null
}

function maskPhone(p: string | null): string {
  if (!p) return '—'
  const digits = p.replace(/\s/g, '')
  return digits.length > 5 ? `${digits.slice(0, 3)} ••• ${digits.slice(-3)}` : p
}

/* ============================================================
 * CUSTOMERS — Customer 360 table with wallet / block / message
 * ============================================================ */
export function CustomersTab({ data, busy, act, highlightId }: TabProps) {
  const [q, setQ] = useState('')
  const [walletFor, setWalletFor] = useState<Profile | null>(null)
  const [walletAmount, setWalletAmount] = useState('')
  const [walletReason, setWalletReason] = useState('')
  const [messageFor, setMessageFor] = useState<Profile | null>(null)
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [blockFor, setBlockFor] = useState<Profile | null>(null)
  const [blockReason, setBlockReason] = useState('')

  const planName = new Map(data.plans.map((p) => [p.id, p.name]))
  const filtered = data.customers.filter((c) => {
    const hay = `${c.full_name} ${c.phone ?? ''} ${c.email ?? ''} ${c.municipality ?? ''} ${c.account_type ?? ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })
  const restrictedCount = data.customers.filter((c) => c.account_status === 'restricted').length
  const amount = Number(walletAmount)
  const preview = walletFor && Number.isFinite(amount) && amount !== 0
    ? Math.max(0, Number(walletFor.wallet_balance ?? 0) + amount)
    : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Customer register
              {restrictedCount > 0 && <Badge variant="outline" className="ml-1 h-5 border-destructive/40 px-2 text-destructive">{restrictedCount} restricted</Badge>}
            </CardTitle>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, phone, area…" className="h-9 w-64" aria-label="Filter customers" />
          </div>
          <p className="text-xs text-muted-foreground">
            Wallet corrections go through the ledger with a reason. Restricting an account pauses new bookings — never silent, always audited (spec 7/10).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-215 text-sm">
            <caption className="sr-only">Customer register with wallets, plans and account status</caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3">Customer</th>
                <th className="pb-2 pr-3">Contact</th>
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">Area</th>
                <th className="pb-2 pr-3">Plan</th>
                <th className="pb-2 pr-3">Wallet</th>
                <th className="pb-2 pr-3">Joined</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!data || filtered.length === 0) && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">{!data ? 'Loading…' : q ? 'No customers match.' : 'No customers yet'}</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className={cn('border-b last:border-0', highlightId === c.id && 'bg-primary/5 ring-1 ring-inset ring-primary/40')}>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{initials(c.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="block truncate font-medium">{c.full_name}</span>
                        {c.account_status === 'restricted' && (
                          <span className="block max-w-52 truncate text-[11px] text-destructive" title={c.block_reason ?? ''}>restricted · {c.block_reason}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{maskPhone(c.phone)}</td>
                  <td className="py-2 pr-3 capitalize text-muted-foreground">{c.account_type ?? '—'}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{c.municipality ?? '—'}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{c.plan_id ? planName.get(c.plan_id) ?? c.plan_id : 'Pay-as-you-go'}{c.plan_credits > 0 && <span className="ml-1 text-primary">({c.plan_credits} left)</span>}</td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{ghs(c.wallet_balance)}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{timeAgo(c.created_at)}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={busy !== null} onClick={() => { setWalletFor(c); setWalletAmount(''); setWalletReason('') }} title="Adjust wallet">
                        <Wallet className="h-3.5 w-3.5" /> Wallet
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={busy !== null} onClick={() => { setMessageFor(c); setMsgTitle(''); setMsgBody('') }} title="Send a message" aria-label="Send a message">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      {c.account_status === 'restricted' ? (
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={busy !== null} onClick={() => act({ action: 'set_account', userId: c.id, restricted: false }, `unblock-${c.id}`)} title="Restore account">
                          <ShieldCheck className="h-3.5 w-3.5" /> Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 gap-1 border-destructive/40 px-2 text-xs text-destructive" disabled={busy !== null} onClick={() => { setBlockFor(c); setBlockReason('') }} title="Restrict account" aria-label="Restrict account">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* wallet adjustment dialog */}
      <Dialog open={walletFor !== null} onOpenChange={(open) => !open && setWalletFor(null)}>
        <DialogContent className="max-w-md">
          {walletFor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Adjust wallet — {walletFor.full_name}</DialogTitle>
                <DialogDescription>Current balance {ghs(walletFor.wallet_balance)}. The entry is added to the ledger — never edited later.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="wallet-amount">Amount (GHS) — negative to debit</Label>
                  <Input id="wallet-amount" type="number" step="0.01" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} placeholder="e.g. 50 or -25" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wallet-reason">Reason (recorded and sent to the customer)</Label>
                  <Textarea id="wallet-reason" value={walletReason} onChange={(e) => setWalletReason(e.target.value)} placeholder="e.g. missed pickup credit for KB-100023" rows={2} />
                </div>
                {preview !== null && (
                  <p className="rounded-md bg-muted p-2 text-xs">New balance: <strong>{ghs(preview)}</strong></p>
                )}
              </div>
              <DialogFooter>
                <Button
                  disabled={busy !== null || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000 || walletReason.trim().length < 4}
                  onClick={async () => {
                    const ok = await act({ action: 'adjust_wallet', userId: walletFor.id, amountGhs: amount, reason: walletReason.trim() }, 'wallet')
                    if (ok) setWalletFor(null)
                  }}
                >
                  Post adjustment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* message dialog */}
      <Dialog open={messageFor !== null} onOpenChange={(open) => !open && setMessageFor(null)}>
        <DialogContent className="max-w-md">
          {messageFor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Message {messageFor.full_name}</DialogTitle>
                <DialogDescription>Delivered to the customer&apos;s notification inbox instantly.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="msg-title">Title</Label>
                  <Input id="msg-title" value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} placeholder="e.g. Your pickup is rescheduled" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg-body">Message</Label>
                  <Textarea id="msg-body" value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="Keep it short and helpful…" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={busy !== null || msgTitle.trim().length < 3 || msgBody.trim().length < 3}
                  onClick={async () => {
                    const ok = await act({ action: 'notify_user', userId: messageFor.id, title: msgTitle.trim(), body: msgBody.trim() }, 'message')
                    if (ok) setMessageFor(null)
                  }}
                >
                  Send message
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* block dialog */}
      <Dialog open={blockFor !== null} onOpenChange={(open) => !open && setBlockFor(null)}>
        <DialogContent className="max-w-md">
          {blockFor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Restrict {blockFor.full_name}</DialogTitle>
                <DialogDescription>New bookings are paused and the customer is told why. Every block is reviewed in the audit trail.</DialogDescription>
              </DialogHeader>
              <Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason — e.g. repeated fake pickup codes at this address" rows={3} />
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={busy !== null || blockReason.trim().length < 4}
                  onClick={async () => {
                    const ok = await act({ action: 'set_account', userId: blockFor.id, restricted: true, reason: blockReason.trim() }, 'block')
                    if (ok) setBlockFor(null)
                  }}
                >
                  Restrict account
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============================================================
 * PLATFORM — flags, pricing, broadcasts, dumping triage, health
 * ============================================================ */
const FLAGS: { key: string; label: string; desc: string; on: string; off: string }[] = [
  { key: 'booking_enabled', label: 'New bookings', desc: 'Kill switch — pause checkout platform-wide while keeping live jobs running.', on: 'Open', off: 'Paused' },
  { key: 'signups_enabled', label: 'New sign-ups', desc: 'Pause registration when onboarding is closed or under abuse.', on: 'Open', off: 'Paused' },
  { key: 'maintenance_mode', label: 'Maintenance banner', desc: 'Shows a banner across every app: customers, operators and this portal.', on: 'On', off: 'Off' },
]

export function PlatformTab({ data, busy, act }: TabProps) {
  const settingsMap = new Map(data.settings.map((s) => [s.key, s]))
  // pricing drafts — derived from server values until the user edits a field
  const [drafts, setDrafts] = useState<Record<string, { price: string; pickups: string }>>({})
  const draftFor = (p: AdminDashboardPayload['plans'][number]) =>
    drafts[p.id] ?? { price: String(p.price_ghs), pickups: String(p.pickups_per_month) }
  // broadcast form
  const [audience, setAudience] = useState<'customers' | 'operators' | 'all'>('customers')
  const [bcKind, setBcKind] = useState<'info' | 'success' | 'warning'>('info')
  const [bcTitle, setBcTitle] = useState('')
  const [bcBody, setBcBody] = useState('')
  const recipients = audience === 'customers' ? data.customers.length : audience === 'operators' ? data.drivers.length : data.customers.length + data.drivers.length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* feature flags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Cog className="h-4 w-4 text-primary" /> Feature flags &amp; kill switches</CardTitle>
            <p className="text-xs text-muted-foreground">Takes effect on the next request — no redeploy. Every change is recorded (spec 20).</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {FLAGS.map((f) => {
              const s = settingsMap.get(f.key)
              const on = s?.value !== 'false'
              return (
                <div key={f.key} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{f.label} <Badge variant="outline" className={cn('ml-1 h-5 px-2', on ? 'border-emerald-300 text-emerald-700' : 'border-gold/40 text-gold-foreground')}>{on ? f.on : f.off}</Badge></p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                    {s && <p className="mt-1 text-[11px] text-muted-foreground">Last changed by {s.updatedByName} · {timeAgo(s.updatedAt)}</p>}
                  </div>
                  <Switch checked={on} disabled={busy !== null} onCheckedChange={(v) => act({ action: 'set_flag', key: f.key, value: v ? 'true' : 'false' }, `flag-${f.key}`)} aria-label={`Toggle ${f.label}`} />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* system health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-primary" /> System health</CardTitle>
            <p className="text-xs text-muted-foreground">Integration status as seen by the live portal (spec 23).</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <HealthRow ok={data.integrations.supabase} label="Supabase database" okText="Connected" badText="Unreachable" hint="auth · data · ledger" />
            <HealthRow ok={data.integrations.paystack} label="Paystack payments" okText="Live keys active" badText="Simulation mode" hint={data.integrations.paystack ? 'collections + webhook' : 'add PAYSTACK_SECRET_KEY to go live'} />
            <HealthRow ok={data.integrations.sms} label="SMS / WhatsApp (Arkesel)" okText="Configured" badText="Not configured" hint="blueprint Phase 2 — notifications are in-app for now" />
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Landmark className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Cloudflare Worker</p>
                <p className="truncate text-xs text-muted-foreground">kumbola.frankkoomson1.workers.dev</p>
              </div>
              <Badge variant="outline" className="border-emerald-300 text-emerald-700">Deployed</Badge>
            </div>
          </CardContent>
        </Card>

        {/* pricing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-primary" /> Plans &amp; pricing</CardTitle>
            <p className="text-xs text-muted-foreground">Edits go live immediately and are audited with before/after values (spec 11 price book).</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.plans.map((p) => {
              const d = draftFor(p)
              const price = Number(d.price)
              const pickups = Number(d.pickups)
              const changed = Number.isFinite(price) && price > 0 && (price !== p.price_ghs || (Number.isFinite(pickups) && pickups > 0 && pickups !== p.pickups_per_month))
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.target ?? '—'}</p>
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`plan-price-${p.id}`} className="text-[10px] uppercase text-muted-foreground">GHS / mo</Label>
                    <Input id={`plan-price-${p.id}`} className="h-8" type="number" step="1" value={d.price} onChange={(e) => setDrafts((s) => ({ ...s, [p.id]: { ...d, price: e.target.value } }))} />
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`plan-pickups-${p.id}`} className="text-[10px] uppercase text-muted-foreground">Pickups</Label>
                    <Input id={`plan-pickups-${p.id}`} className="h-8" type="number" step="1" value={d.pickups} onChange={(e) => setDrafts((s) => ({ ...s, [p.id]: { ...d, pickups: e.target.value } }))} />
                  </div>
                  <Button size="sm" className="h-8" disabled={!changed || busy !== null} onClick={() => act({ action: 'update_plan', planId: p.id, priceGhs: price, pickupsPerMonth: Number.isFinite(pickups) ? pickups : undefined }, `plan-${p.id}`)}>
                    Save
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* broadcast */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-primary" /> Broadcast</CardTitle>
            <p className="text-xs text-muted-foreground">In-app notification to every selected account — delivered instantly (spec 14).</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
                  <SelectTrigger className="h-9" aria-label="Broadcast audience"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customers">Customers ({data.customers.length})</SelectItem>
                    <SelectItem value="operators">Operators ({data.drivers.length})</SelectItem>
                    <SelectItem value="all">Everyone ({recipients})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tone</Label>
                <Select value={bcKind} onValueChange={(v) => setBcKind(v as typeof bcKind)}>
                  <SelectTrigger className="h-9" aria-label="Broadcast tone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="success">Good news</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input value={bcTitle} onChange={(e) => setBcTitle(e.target.value)} placeholder="Title — e.g. Thursday sanitation day: book early" />
            <Textarea value={bcBody} onChange={(e) => setBcBody(e.target.value)} placeholder="Message body…" rows={3} />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Delivers to <strong className="text-foreground">{recipients}</strong> account{recipients === 1 ? '' : 's'}.</p>
              <Button
                disabled={busy !== null || bcTitle.trim().length < 3 || bcBody.trim().length < 3}
                onClick={async () => {
                  const ok = await act({ action: 'broadcast', audience, title: bcTitle.trim(), body: bcBody.trim(), kind: bcKind }, 'broadcast')
                  if (ok) { setBcTitle(''); setBcBody('') }
                }}
              >
                Send broadcast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* dumping reports triage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-primary" /> Illegal-dumping reports — triage</CardTitle>
          <p className="text-xs text-muted-foreground">Community reports routed to the responsible assembly. Move them through the pipeline as you verify.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.reports.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No reports</p>}
          {data.reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                r.severity === 'high' ? 'bg-destructive/10 text-destructive' : r.severity === 'medium' ? 'bg-gold/20 text-gold-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.location_text}</p>
                <p className="truncate text-xs text-muted-foreground">{r.municipality} · {r.description} · {r.reporter_name ?? 'Anonymous'} · {timeAgo(r.created_at)}</p>
              </div>
              <Badge variant="outline" className={cn(
                'h-6',
                r.severity === 'high' ? 'border-destructive/40 text-destructive' : 'border-border'
              )}>{r.severity}</Badge>
              <Select value={r.status} disabled={busy !== null} onValueChange={(v) => act({ action: 'set_report_status', reportId: r.id, status: v }, `dump-${r.id}`)}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function HealthRow({ ok, label, okText, badText, hint }: { ok: boolean; label: string; okText: string; badText: string; hint: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', ok ? 'bg-emerald-500' : 'bg-gold')} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <span className={cn('text-xs font-medium', ok ? 'text-emerald-700' : 'text-gold-foreground')}>{ok ? okText : badText}</span>
    </div>
  )
}

/* ============================================================
 * REPORTS — controlled exports + printable executive summary
 * ============================================================ */
const REPORT_DEFS: { type: string; name: string; desc: string; icon: React.ComponentType<{ className?: string }>; hasDays: boolean; defaults: number }[] = [
  { type: 'bookings', name: 'Operations report', desc: 'Every job in the window: status, area, operator, amounts, lifecycle timestamps.', icon: Truck, hasDays: true, defaults: 30 },
  { type: 'transactions', name: 'Finance report', desc: 'Full wallet ledger: top-ups, payments, payouts, commissions and admin adjustments.', icon: Wallet, hasDays: true, defaults: 30 },
  { type: 'impact', name: 'Impact & funder summary', desc: 'Tonnes collected, verified disposal rate, recyclables recovered, operator income — the page funders want.', icon: Leaf, hasDays: true, defaults: 90 },
  { type: 'users', name: 'Accounts register', desc: 'All customers and operators with plan, wallet, status and vetting state.', icon: Users, hasDays: false, defaults: 0 },
  { type: 'audit', name: 'Audit trail export', desc: 'Every staff action recorded by the Command Centre — for compliance reviews.', icon: History, hasDays: false, defaults: 0 },
]

export function ReportsTab({ data, busy }: TabProps) {
  const [daysMap, setDaysMap] = useState<Record<string, number>>(() => Object.fromEntries(REPORT_DEFS.map((r) => [r.type, r.defaults])))
  const [exportFor, setExportFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [downloading, setDownloading] = useState(false)

  const k = data.kpis
  const decisions = (data.vettingQueue.filter((d) => d.vetting_status === 'pending_review').length) + (data.reviewQueue.filter((r) => r.status === 'pending').length)

  async function download(type: string, why: string) {
    setDownloading(true)
    try {
      const days = REPORT_DEFS.find((r) => r.type === type)?.hasDays ? daysMap[type] ?? 30 : null
      const params = new URLSearchParams({ type, reason: why })
      if (days) params.set('days', String(days))
      const { session } = useSession.getState()
      const res = await fetch(`/api/admin/report?${params}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? `Export failed (${res.status})`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kumbola_${type}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded — the export was recorded in the audit trail.')
    } catch {
      toast.error('Could not download the report — check your connection.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* printable executive summary — print scope lives in globals.css (.print-sheet) */}
      <Card className="print-sheet border-primary/30">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4 text-primary" /> Executive summary — Greater Kumasi</CardTitle>
            <Button size="sm" variant="outline" className="gap-2 no-print" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print summary
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Live figures from the Command Centre · generated {new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Jobs delivered" value={num(data.byStatus.filter((s) => s.status === 'verified' || s.status === 'collected').reduce((s, x) => s + x.count, 0))} />
            <SummaryStat label="Verified tonnage" value={`${num(k.tonnesVerified, 1)} t`} />
            <SummaryStat label="Verification rate" value={`${k.verificationRate}%`} />
            <SummaryStat label="Recyclables" value={`${num(k.recyclablesKg)} kg`} />
            <SummaryStat label="Platform revenue" value={ghs(k.revenueYtd, { compact: true })} />
            <SummaryStat label="Operator earnings" value={ghs(k.driverPayouts, { compact: true })} />
            <SummaryStat label="Accounts served" value={num(k.households + k.businesses + k.drivers)} />
            <SummaryStat label="Decisions waiting" value={num(decisions)} tone={decisions === 0 ? 'ok' : 'warn'} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            KumBola — inclusive waste collection for Greater Kumasi · every cedi and kilogram on this page is backed by a verified disposal record.
          </p>
        </CardContent>
      </Card>

      {/* controlled exports */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Generate a report</CardTitle>
          <p className="text-xs text-muted-foreground">
            Downloads are Excel-ready CSV. Every export states a reason and is logged to the audit trail — controlled exports, spec 16.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {REPORT_DEFS.map((r) => (
            <div key={r.type} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <r.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              {r.hasDays && (
                <Select value={String(daysMap[r.type])} onValueChange={(v) => setDaysMap((m) => ({ ...m, [r.type]: Number(v) }))}>
                  <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" className="gap-2" disabled={busy !== null || downloading} onClick={() => { setExportFor(r.type); setReason('') }}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* reason dialog (controlled exports) */}
      <Dialog open={exportFor !== null} onOpenChange={(open) => !open && setExportFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">State the reason for this export</DialogTitle>
            <DialogDescription>Personal data leaves the platform — the reason, requester and row count are recorded in the audit trail (spec 16).</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. monthly funder report for WasteCure steering committee" rows={2} />
          <DialogFooter>
            <Button
              disabled={downloading || reason.trim().length < 4}
              onClick={async () => {
                if (!exportFor) return
                const type = exportFor
                setExportFor(null)
                await download(type, reason.trim())
              }}
            >
              {downloading ? 'Preparing…' : 'Download CSV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryStat({ label, value, tone = 'ok' }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className={cn('rounded-lg border p-3', tone === 'warn' && 'border-gold/40 bg-gold/5')}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

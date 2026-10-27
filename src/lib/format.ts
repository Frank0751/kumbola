// ============================================================
// KumBola — formatting & small helpers
// ============================================================

export function ghs(n: number | null | undefined, opts: { compact?: boolean; decimals?: number } = {}): string {
  const v = Number(n ?? 0)
  if (opts.compact && Math.abs(v) >= 1000) {
    if (Math.abs(v) >= 1_000_000) return `GHS ${(v / 1_000_000).toFixed(1)}m`
    return `GHS ${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k`
  }
  return `GHS ${v.toLocaleString('en-GH', {
    minimumFractionDigits: opts.decimals ?? (Number.isInteger(v) ? 0 : 2),
    maximumFractionDigits: opts.decimals ?? 2,
  })}`
}

export function num(n: number | null | undefined, decimals = 0): string {
  return Number(n ?? 0).toLocaleString('en-GH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function tonnes(kg: number | null | undefined, decimals = 1): string {
  return num((Number(kg ?? 0)) / 1000, decimals)
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} wk ago`
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })
}

export function dateTimeShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

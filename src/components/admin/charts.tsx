'use client'

// Lightweight SVG charts for the KumBola Command Centre (no external deps).
// Interactive: hover tooltips on the line chart, clickable bar lists,
// native tooltips on the mini bars. Range and drill-down live in the parent.

import { useRef, useState } from 'react'

export function DailyChart({
  data,
}: {
  data: { date: string; bookings: number; tonnes: number }[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const W = 640
  const H = 200
  const PADX = 34
  const PADY = 24
  const maxB = Math.max(4, ...data.map((d) => d.bookings))
  const maxT = Math.max(0.5, ...data.map((d) => d.tonnes))
  const n = data.length
  const x = (i: number) => PADX + (i * (W - PADX * 2)) / Math.max(1, n - 1)
  const yB = (v: number) => H - PADY - (v / maxB) * (H - PADY * 2)
  const yT = (v: number) => H - PADY - (v / maxT) * (H - PADY * 2)

  const lineB = data.map((d, i) => `${x(i)},${yB(d.bookings)}`).join(' ')
  const lineT = data.map((d, i) => `${x(i)},${yT(d.tonnes)}`).join(' ')
  const areaT = `${PADX},${H - PADY} ${lineT} ${x(n - 1)},${H - PADY}`

  // map pointer x → nearest index
  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PADX) / (W - PADX * 2)) * Math.max(1, n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }

  const hd = hover !== null ? data[hover] : null

  return (
    <div className="relative w-full overflow-x-auto scroll-slim" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-48 w-full min-w-[420px]"
        role="img"
        aria-label="Daily bookings and verified tonnage"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={PADX} x2={W - PADX} y1={PADY + f * (H - PADY * 2)} y2={PADY + f * (H - PADY * 2)} className="stroke-border" strokeDasharray="3 4" />
        ))}
        <polygon points={areaT} className="fill-primary/10" />
        <polyline points={lineT} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={lineB} fill="none" className="stroke-[color:var(--chart-2)]" strokeWidth="2.5" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={d.date} cx={x(i)} cy={yT(d.tonnes)} r={hover === i ? 5 : 3} className="fill-primary transition-all" />
        ))}
        {data.map((d, i) =>
          i % Math.ceil(n / 8) === 0 ? (
            <text key={`l${d.date}`} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {d.date.slice(5)}
            </text>
          ) : null
        )}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PADY} y2={H - PADY} className="stroke-primary/40" strokeWidth="1" />
        )}
      </svg>
      {hover !== null && hd && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="font-semibold">{hd.date}</p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-0.5 w-3 rounded bg-primary" /> {hd.tonnes} t verified
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-0.5 w-3 rounded bg-[color:var(--chart-2)]" /> {hd.bookings} bookings
          </p>
        </div>
      )}
      <div className="mt-1 flex gap-4 pl-8 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" /> Verified tonnes</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[color:var(--chart-2)]" /> Bookings</span>
      </div>
    </div>
  )
}

export function BarList({
  items,
  unit = 't',
  onSelect,
}: {
  items: { label: string; value: number; sub?: string }[]
  unit?: string
  onSelect?: (label: string) => void
}) {
  const max = Math.max(0.001, ...items.map((i) => i.value))
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div
          key={it.label}
          className={onSelect ? 'cursor-pointer rounded-lg p-1 transition-colors hover:bg-muted/60' : undefined}
          onClick={onSelect ? () => onSelect(it.label) : undefined}
          role={onSelect ? 'button' : undefined}
          title={onSelect ? `Show ${it.label} jobs` : undefined}
        >
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{it.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {it.value.toLocaleString('en-GH', { maximumFractionDigits: 1 })} {unit}{it.sub ? ` · ${it.sub}` : ''}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[color:var(--chart-3)]"
              style={{ width: `${Math.max(4, (it.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>}
    </div>
  )
}

export function MiniBars({
  data,
  unit = '',
  colorClass = 'fill-primary',
}: {
  data: { date: string; value: number }[]
  unit?: string
  colorClass?: string
}) {
  const W = 640
  const H = 180
  const PADX = 10
  const PADY = 22
  const max = Math.max(1, ...data.map((d) => d.value))
  const n = Math.max(1, data.length)
  const slot = (W - PADX * 2) / n
  const bw = Math.max(6, slot * 0.55)
  const x = (i: number) => PADX + slot * i + (slot - bw) / 2
  const h = (v: number) => (v / max) * (H - PADY * 2)
  const y = (v: number) => H - PADY - h(v)

  return (
    <div className="w-full overflow-x-auto scroll-slim">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full min-w-[420px]" role="img" aria-label="Daily series bar chart">
        {[0, 1].map((f) => (
          <line key={f} x1={PADX} x2={W - PADX} y1={PADY + f * (H - PADY * 2)} y2={PADY + f * (H - PADY * 2)} className="stroke-border" strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => (
          <g key={d.date}>
            <title>{`${d.date}: ${d.value.toLocaleString('en-GH', { maximumFractionDigits: 1 })} ${unit}`}</title>
            <rect x={x(i)} y={y(d.value)} width={bw} height={Math.max(2, h(d.value))} rx={3} className={`${colorClass} transition-opacity hover:opacity-75`} opacity={d.value === 0 ? 0.25 : 1} />
            {i % Math.ceil(n / 8) === 0 && (
              <text x={x(i) + bw / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
                {d.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {unit && (
        <p className="text-xs text-muted-foreground">
          Peak {max.toLocaleString('en-GH', { maximumFractionDigits: 1 })} {unit} / day
        </p>
      )}
    </div>
  )
}

export function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const R = 42
  const C = 2 * Math.PI * R
  // precompute arc segments (cumulative offsets) before rendering
  const arcs: { label: string; color: string; dash: number; offset: number }[] = []
  let acc = 0
  for (const s of slices) {
    const dash = (s.value / total) * C
    arcs.push({ label: s.label, color: s.color, dash: Math.max(0, dash - 2), offset: acc })
    acc += dash
  }
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 110 110" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label="Distribution donut chart">
        <circle cx="55" cy="55" r={R} fill="none" className="stroke-muted" strokeWidth="14" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="55"
            cy="55"
            r={R}
            fill="none"
            className={a.color}
            strokeWidth="14"
            strokeDasharray={`${a.dash} ${C - a.dash}`}
            strokeDashoffset={-a.offset}
          >
            <title>{`${a.label}: ${Math.round((a.dash / C) * 100)}%`}</title>
          </circle>
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.color.replace('stroke-', 'bg-')}`} />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="tabular-nums font-semibold">{s.value.toLocaleString()}</span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

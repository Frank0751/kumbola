'use client'

// Lightweight SVG charts for the KumBola city dashboard (no external deps)

export function DailyChart({
  data,
}: {
  data: { date: string; bookings: number; tonnes: number }[]
}) {
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

  return (
    <div className="w-full overflow-x-auto scroll-slim">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full min-w-[420px]" role="img" aria-label="Daily bookings and verified tonnage, last 14 days">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={PADX} x2={W - PADX} y1={PADY + f * (H - PADY * 2)} y2={PADY + f * (H - PADY * 2)} className="stroke-border" strokeDasharray="3 4" />
        ))}
        <polygon points={areaT} className="fill-primary/10" />
        <polyline points={lineT} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={lineB} fill="none" className="stroke-[color:var(--chart-2)]" strokeWidth="2.5" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={d.date} cx={x(i)} cy={yT(d.tonnes)} r="3" className="fill-primary" />
        ))}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text key={`l${d.date}`} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {d.date.slice(5)}
            </text>
          ) : null
        )}
      </svg>
      <div className="mt-1 flex gap-4 pl-8 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" /> Verified tonnes</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[color:var(--chart-2)]" /> Bookings</span>
      </div>
    </div>
  )
}

export function BarList({ items, unit = 't' }: { items: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(0.001, ...items.map((i) => i.value))
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
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
          />
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

'use client'

/**
 * KumBola brand logo — recycling loop + tricycle silhouette in an olive leaf.
 * Pure SVG so it inherits currentColor and scales crisply everywhere.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="KumBola logo"
    >
      {/* mark: rounded square with tricycle + cycle arrows */}
      <g>
        <rect x="2" y="2" width="52" height="52" rx="16" className="fill-primary" />
        <rect x="13" y="17" width="17" height="12" rx="2" className="fill-primary-foreground" opacity="0.95" />
        <path
          d="M30 23h9l4 6"
          className="stroke-primary-foreground"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="19" cy="34" r="4.6" className="fill-gold" />
        <circle cx="38" cy="34" r="4.6" className="fill-gold" />
        <circle cx="19" cy="34" r="1.8" className="fill-forest" opacity="0.55" />
        <circle cx="38" cy="34" r="1.8" className="fill-forest" opacity="0.55" />
        <path
          d="M12 43c6 5 26 5 32-2"
          className="stroke-gold"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        <path d="M44.5 39.5l1.2 3.4-3.5.4" className="stroke-gold" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      {/* wordmark */}
      <text
        x="66"
        y="34"
        className="fill-foreground font-display"
        style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.5px' }}
      >
        Kum<tspan className="fill-primary">Bola</tspan>
      </text>
      <text
        x="67"
        y="48"
        className="fill-muted-foreground"
        style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '2.6px' }}
      >
        KILL TRASH · KUMASI
      </text>
    </svg>
  )
}

/** Compact square mark for tight spaces (avatars, chat bubbles). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="KumBola mark">
      <rect x="2" y="2" width="52" height="52" rx="16" className="fill-primary" />
      <rect x="13" y="17" width="17" height="12" rx="2" className="fill-primary-foreground" opacity="0.95" />
      <path d="M30 23h9l4 6" className="stroke-primary-foreground" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="19" cy="34" r="4.6" className="fill-gold" />
      <circle cx="38" cy="34" r="4.6" className="fill-gold" />
      <path d="M12 43c6 5 26 5 32-2" className="stroke-gold" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.9" />
    </svg>
  )
}

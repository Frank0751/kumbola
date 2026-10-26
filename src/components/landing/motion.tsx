'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Tasteful scroll-reveal wrapper. Fades/slides content in when it enters the
 * viewport, once. Respects prefers-reduced-motion by rendering statically.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li'
}) {
  const reduce = useReducedMotion()
  // Cast keeps TS happy about the div/li prop union — both take the same set here.
  const MotionTag = (as === 'li' ? motion.li : motion.div) as typeof motion.div

  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </MotionTag>
  )
}

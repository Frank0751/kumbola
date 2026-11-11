'use client'

import { useEffect } from 'react'
import { useSession } from '@/lib/store'

/**
 * Kicks off the zustand persist rehydration right after mount, once React has
 * finished hydrating the server HTML. Rendered once from the root layout so
 * every route restores the session the same way. During the hydration pass the
 * store is still in its initial state (session=null, hydrating=true), which is
 * exactly what the server rendered, so no hydration mismatch can occur.
 */
export function StoreHydrator() {
  useEffect(() => {
    useSession.persist.rehydrate()
  }, [])
  return null
}

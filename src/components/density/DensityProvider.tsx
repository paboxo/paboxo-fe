import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DensityContext } from './useDensity'
import type { Density } from './useDensity'

const STORAGE_KEY = 'density'
const DESKTOP_QUERY = '(min-width: 640px)'

function readStored(): Density {
  if (typeof window === 'undefined') return 'simple'
  return window.localStorage.getItem(STORAGE_KEY) === 'pro' ? 'pro' : 'simple'
}

function applyDensity(density: Density) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.density = density
  }
}

/**
 * Density is responsive (U9, R7): desktop always renders the full **Pro** layout,
 * and the Simple/Pro choice is a **mobile-only** affordance (default Simple on
 * small screens). The toggle is therefore only shown on mobile.
 */
export function DensityProvider({ children }: { children: ReactNode }) {
  // The user's mobile preference; ignored on desktop (which is always Pro).
  const [stored, setStored] = useState<Density>('simple')
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    setStored(readStored())
    const mq = window.matchMedia(DESKTOP_QUERY)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const density: Density = isDesktop ? 'pro' : stored

  useEffect(() => {
    applyDensity(density)
  }, [density])

  const setDensity = useCallback((next: Density) => {
    setStored(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable — density still applies for this session */
    }
  }, [])

  const toggle = useCallback(() => {
    setDensity(stored === 'pro' ? 'simple' : 'pro')
  }, [stored, setDensity])

  const value = useMemo(
    () => ({ density, setDensity, toggle }),
    [density, setDensity, toggle],
  )

  return (
    <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
  )
}

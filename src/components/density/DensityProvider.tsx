import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DensityContext } from './useDensity'
import type { Density } from './useDensity'

const STORAGE_KEY = 'density'

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
 * Provides the Simple↔Pro density and mirrors it onto `data-density` so CSS can
 * reveal Pro-only fields in place (U9, R7). Persisted like the theme preference.
 */
export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>('simple')

  useEffect(() => {
    const initial = readStored()
    setDensityState(initial)
    applyDensity(initial)
  }, [])

  const setDensity = useCallback((next: Density) => {
    setDensityState(next)
    applyDensity(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable — density still applies for this session */
    }
  }, [])

  const toggle = useCallback(() => {
    setDensity(density === 'pro' ? 'simple' : 'pro')
  }, [density, setDensity])

  const value = useMemo(
    () => ({ density, setDensity, toggle }),
    [density, setDensity, toggle],
  )

  return (
    <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
  )
}

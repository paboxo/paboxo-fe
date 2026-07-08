import { createContext, useContext } from 'react'

/** Tide density (U9, KTD3). Simple is the calm default; Pro reveals reserved fields in place. */
export type Density = 'simple' | 'pro'

export interface DensityContextValue {
  density: Density
  setDensity: (density: Density) => void
  toggle: () => void
}

export const DensityContext = createContext<DensityContextValue | null>(null)

export function useDensity(): DensityContextValue {
  const value = useContext(DensityContext)
  if (!value) {
    throw new Error('useDensity must be used within a DensityProvider')
  }
  return value
}

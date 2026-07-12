import { describe, expect, it } from 'vitest'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { METRICS, breakdownFor } from './metrics'
import type { Contribution } from './metrics'

const [m0, m1, m2] = MOCK_MARKETS
const COLLATERAL = METRICS.find((m) => m.key === 'collateral')!
const SUPPLY = METRICS.find((m) => m.key === 'supply')!

const contributions: Contribution[] = [
  {
    market: m0,
    stat: { active: true, suppliedUsd: 1000, collateralUsd: 600, debtUsd: 0 },
  },
  {
    market: m1,
    stat: { active: true, suppliedUsd: 500, collateralUsd: 900, debtUsd: 0 },
  },
  {
    market: m2,
    stat: { active: false, suppliedUsd: 999, collateralUsd: 999, debtUsd: 0 },
  },
]

describe('breakdownFor', () => {
  it('breaks collateral down by collateral token, largest first', () => {
    const items = breakdownFor(contributions, COLLATERAL)
    expect(items.map((i) => i.assetSymbol)).toEqual([
      m1.collateralSymbol,
      m0.collateralSymbol,
    ])
    expect(items[0].valueUsd).toBe(900)
    expect(items[0].assetAddress).toBe(m1.collateralAddress)
  })

  it('breaks Earn down by pool but labels the asset pxUSDT', () => {
    const items = breakdownFor(contributions, SUPPLY)
    expect(items.map((i) => i.valueUsd)).toEqual([1000, 500])
    expect(items.every((i) => i.assetSymbol === 'pxUSDT')).toBe(true)
  })

  it('excludes inactive pools and zero values', () => {
    const items = breakdownFor(contributions, COLLATERAL)
    expect(items.some((i) => i.id === m2.id)).toBe(false)
  })
})

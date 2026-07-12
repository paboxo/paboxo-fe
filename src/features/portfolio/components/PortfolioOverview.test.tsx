// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MOCK_MARKETS } from '#/features/markets/mock'
import type { MarketPosition } from '#/features/position/hooks/usePosition'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { PortfolioOverview, sumPoolStats } from './PortfolioOverview'

vi.mock('#/features/markets/hooks/useMarkets', () => ({ useMarkets: vi.fn() }))
vi.mock('#/features/position/hooks/usePosition', () => ({
  useMarketPosition: vi.fn(),
}))

const mockUseMarkets = vi.mocked(useMarkets)
const mockUseMarketPosition = vi.mocked(useMarketPosition)

const markets = MOCK_MARKETS.slice(0, 3)
const [m0, m1] = markets

function posQuery(
  over: Partial<ReturnType<typeof useMarketPosition>>,
): ReturnType<typeof useMarketPosition> {
  return { data: null, isLoading: false, error: null, ...over }
}

const empty: MarketPosition = { supplies: [], borrows: [] }

function poolPosition(m: (typeof markets)[number]): MarketPosition {
  return {
    supplies: [
      {
        symbol: m.collateralSymbol,
        balance: 1n,
        decimals: 18,
        valueUsd: 600,
        apy: 0,
      },
      {
        symbol: m.borrowSymbol,
        balance: 1n,
        decimals: 6,
        valueUsd: 1000,
        apy: 4,
      },
    ],
    borrows: [
      { symbol: m.borrowSymbol, debt: 1n, decimals: 6, valueUsd: 400, apr: 5 },
    ],
    healthFactor: 1.4,
  }
}

describe('sumPoolStats', () => {
  it('counts only active pools and sums their USD figures', () => {
    const totals = sumPoolStats([
      { active: true, suppliedUsd: 1000, collateralUsd: 600, debtUsd: 400 },
      { active: true, suppliedUsd: 500, collateralUsd: 200, debtUsd: 100 },
      { active: false, suppliedUsd: 999, collateralUsd: 999, debtUsd: 999 },
    ])
    expect(totals.activePools).toBe(2)
    expect(totals.suppliedUsd).toBe(1500)
    expect(totals.collateralUsd).toBe(800)
    expect(totals.debtUsd).toBe(500)
    expect(totals.netUsd).toBe(1500 + 800 - 500)
  })

  it('is all zeros with no active pools', () => {
    expect(sumPoolStats([])).toEqual({
      activePools: 0,
      suppliedUsd: 0,
      collateralUsd: 0,
      debtUsd: 0,
      netUsd: 0,
    })
  })
})

describe('PortfolioOverview', () => {
  beforeEach(() => {
    mockUseMarkets.mockReturnValue({
      data: markets,
      isLoading: false,
      error: null,
    })
  })

  it('shows the active pool count and USD totals across active pools', async () => {
    mockUseMarketPosition.mockImplementation((id) =>
      posQuery({
        data:
          id === m0.id
            ? poolPosition(m0)
            : id === m1.id
              ? poolPosition(m1)
              : empty,
      }),
    )

    render(<PortfolioOverview />)

    // Two of three pools are active.
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy())
    expect(screen.getByText('Active pools')).toBeTruthy()
    // Supplied = 2 × $1,000; collateral = 2 × $600; debt = 2 × $400.
    expect(screen.getByText('$2,000.00')).toBeTruthy()
    expect(screen.getByText('$1,200.00')).toBeTruthy()
    expect(screen.getByText('$800.00')).toBeTruthy()
  })
})

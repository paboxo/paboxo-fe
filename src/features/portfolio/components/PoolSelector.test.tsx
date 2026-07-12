// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MOCK_MARKETS } from '#/features/markets/mock'
import type { MarketPosition } from '#/features/position/hooks/usePosition'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { PoolSelector } from './PoolSelector'

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
function pos(m: (typeof markets)[number]): MarketPosition {
  return {
    supplies: [
      {
        symbol: m.collateralSymbol,
        balance: 1n,
        decimals: 18,
        valueUsd: 600,
        apy: 0,
      },
    ],
    borrows: [],
    healthFactor: 1.4,
  }
}

beforeEach(() => {
  mockUseMarkets.mockReturnValue({
    data: markets,
    isLoading: false,
    error: null,
  })
  mockUseMarketPosition.mockImplementation((id) =>
    posQuery({ data: id === m0.id || id === m1.id ? pos(m0) : empty }),
  )
})

describe('PoolSelector', () => {
  it('shows a tab per active pool and the selected pool detail', async () => {
    render(<PoolSelector />)

    // Only the two active pools get tabs.
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBe(2))
    // The first active pool is selected by default — its detail figures show.
    expect(screen.getByText('Collateral')).toBeTruthy()
  })

  it('selects another pool when its tab is clicked', async () => {
    render(<PoolSelector />)

    const tabs = await screen.findAllByRole('tab')
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')

    fireEvent.click(tabs[1])
    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
    expect(tabs[0].getAttribute('aria-selected')).toBe('false')
  })

  it('shows the empty state when no pool is active', async () => {
    mockUseMarketPosition.mockImplementation(() => posQuery({ data: empty }))
    render(<PoolSelector />)
    expect(await screen.findByText('No open positions')).toBeTruthy()
  })
})

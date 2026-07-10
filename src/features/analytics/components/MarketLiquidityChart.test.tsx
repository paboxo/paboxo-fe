// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MarketView } from '#/features/markets/types'
import { MarketLiquidityChart } from './MarketLiquidityChart'
import { useLiquidityHistory } from '../hooks/useLiquidityHistory'

vi.mock('../hooks/useLiquidityHistory', () => ({
  useLiquidityHistory: vi.fn(),
}))
const mockHook = vi.mocked(useLiquidityHistory)

const market = {
  poolAddress: '0x0000000000000000000000000000000000000001',
  availableLiquidityUsd: 1_250_000,
} as unknown as MarketView

describe('MarketLiquidityChart', () => {
  it('shows a distinct error state when the indexer request fails', () => {
    mockHook.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('boom'),
    })
    render(<MarketLiquidityChart market={market} />)
    expect(screen.getByText(/Couldn't load liquidity/)).toBeTruthy()
  })

  it('falls back to the current-value indicator when there is no series (KTD4)', () => {
    mockHook.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<MarketLiquidityChart market={market} />)
    // Current-value indicator, not a fabricated chart.
    expect(screen.getByText(/trend appears once the indexer/)).toBeTruthy()
    expect(screen.queryByText(/Couldn't load liquidity/)).toBeNull()
  })

  it('renders the chart when a series exists', () => {
    mockHook.mockReturnValue({
      data: [
        { timestamp: 1_720_000_000, liquidityUsd: 1_000_000 },
        { timestamp: 1_720_086_400, liquidityUsd: 1_050_000 },
      ],
      isLoading: false,
      error: null,
    })
    render(<MarketLiquidityChart market={market} />)
    expect(screen.getByText('Liquidity')).toBeTruthy()
    expect(screen.queryByText(/trend appears once the indexer/)).toBeNull()
  })
})

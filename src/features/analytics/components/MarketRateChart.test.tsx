// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MarketView } from '#/features/markets/types'
import { MarketRateChart } from './MarketRateChart'
import { useRateHistory } from '../hooks/useRateHistory'

vi.mock('../hooks/useRateHistory', () => ({ useRateHistory: vi.fn() }))
const mockHook = vi.mocked(useRateHistory)

const market = {
  poolAddress: '0x0000000000000000000000000000000000000001',
} as unknown as MarketView

describe('MarketRateChart', () => {
  it('shows a distinct error state when the indexer request fails', () => {
    mockHook.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('boom'),
    })
    render(<MarketRateChart market={market} />)
    expect(screen.getByText(/Couldn't load rate history/)).toBeTruthy()
    expect(screen.queryByText(/Current on-chain rate/)).toBeNull()
  })

  it('shows the current on-chain rate when there is no history series', () => {
    mockHook.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<MarketRateChart market={market} />)
    expect(screen.getByText(/Current on-chain rate/)).toBeTruthy()
    expect(screen.queryByText(/Couldn't load/)).toBeNull()
  })

  it('renders neither empty nor error while loading', () => {
    mockHook.mockReturnValue({ data: [], isLoading: true, error: null })
    render(<MarketRateChart market={market} />)
    expect(screen.queryByText(/Current on-chain rate/)).toBeNull()
    expect(screen.queryByText(/Couldn't load/)).toBeNull()
  })

  it('renders the chart (no empty/error) when points exist', () => {
    mockHook.mockReturnValue({
      data: [{ timestamp: 1_720_000_000, borrowApr: 7, supplyApy: 4 }],
      isLoading: false,
      error: null,
    })
    render(<MarketRateChart market={market} />)
    expect(screen.getByText('Rate history')).toBeTruthy()
    expect(screen.queryByText(/Current on-chain rate/)).toBeNull()
    expect(screen.queryByText(/Couldn't load/)).toBeNull()
  })
})

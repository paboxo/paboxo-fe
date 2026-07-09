import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { EarnList } from './EarnList'

vi.mock('#/features/markets/hooks/useMarkets', () => ({ useMarkets: vi.fn() }))

const mockUseMarkets = vi.mocked(useMarkets)

beforeEach(() => {
  mockUseMarkets.mockReturnValue({
    data: MOCK_MARKETS,
    isLoading: false,
    error: null,
  })
})

// Covers R5.
describe('EarnList', () => {
  it('renders a table of pools with pool-level metrics (no wallet needed)', () => {
    render(<EarnList />)
    // Table headers for the pool metrics.
    expect(screen.getByText('Supply APY')).toBeTruthy()
    expect(screen.getByText('Total supply')).toBeTruthy()
    expect(screen.getByText('Interest rate')).toBeTruthy()
    expect(screen.getByText('Liquidity')).toBeTruthy()
    // One row per pool, each linking into its lend page.
    const rows = screen.getAllByRole('row')
    // header row + one per market
    expect(rows.length).toBe(MOCK_MARKETS.length + 1)
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toContain(
      '/earn/',
    )
  })

  it('shows no connect-wallet prompt on the list', () => {
    render(<EarnList />)
    expect(screen.queryByText(/Connect a wallet/)).toBeNull()
  })

  it('renders a loading state while pools load', () => {
    mockUseMarkets.mockReturnValue({ data: [], isLoading: true, error: null })
    render(<EarnList />)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders an empty state when there are no pools', () => {
    mockUseMarkets.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<EarnList />)
    expect(screen.getByText('No pools yet')).toBeTruthy()
  })
})

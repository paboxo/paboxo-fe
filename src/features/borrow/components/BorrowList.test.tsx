import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { BorrowList } from './BorrowList'

vi.mock('#/features/markets/hooks/useMarkets', () => ({ useMarkets: vi.fn() }))

const mockUseMarkets = vi.mocked(useMarkets)

beforeEach(() => {
  mockUseMarkets.mockReturnValue({
    data: MOCK_MARKETS,
    isLoading: false,
    error: null,
  })
})

// Covers R7.
describe('BorrowList', () => {
  it('renders a table of pools with pool-level metrics (no wallet needed)', () => {
    render(<BorrowList />)
    expect(screen.getByText('Borrow APR')).toBeTruthy()
    expect(screen.getByText('Total supply')).toBeTruthy()
    expect(screen.getByText('LTV')).toBeTruthy()
    expect(screen.getByText('Liq. threshold')).toBeTruthy()
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBe(MOCK_MARKETS.length + 1)
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toContain(
      '/borrow/',
    )
  })

  it('shows no connect-wallet prompt on the list', () => {
    render(<BorrowList />)
    expect(screen.queryByText(/Connect a wallet/)).toBeNull()
  })

  it('renders a loading state while pools load', () => {
    mockUseMarkets.mockReturnValue({ data: [], isLoading: true, error: null })
    render(<BorrowList />)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders an empty state when there are no pools', () => {
    mockUseMarkets.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<BorrowList />)
    expect(screen.getByText('No pools yet')).toBeTruthy()
  })
})

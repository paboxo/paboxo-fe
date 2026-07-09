import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketPosition } from '#/features/position/hooks/usePosition'
import { BorrowList } from './BorrowList'

vi.mock('wagmi', () => ({ useAccount: vi.fn() }))
vi.mock('@rainbow-me/rainbowkit', () => ({ useConnectModal: vi.fn() }))
vi.mock('#/features/markets/hooks/useMarkets', () => ({ useMarkets: vi.fn() }))
vi.mock('#/features/position/hooks/usePosition', () => ({
  useMarketPosition: vi.fn(),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseConnectModal = vi.mocked(useConnectModal)
const mockUseMarkets = vi.mocked(useMarkets)
const mockUseMarketPosition = vi.mocked(useMarketPosition)

const positionOnPxwhsk = (id: string): MarketPosition =>
  id === 'pxwhsk'
    ? {
        supplies: [
          {
            symbol: 'pxWHSK',
            balance: 0n,
            decimals: 18,
            valueUsd: 8_000,
            apy: 0,
          },
        ],
        borrows: [
          { symbol: 'pxUSDT', debt: 0n, decimals: 6, valueUsd: 3_172, apr: 7 },
        ],
        healthFactor: 1.89,
      }
    : { supplies: [], borrows: [] }

beforeEach(() => {
  mockUseConnectModal.mockReturnValue({
    openConnectModal: vi.fn(),
  } as unknown as ReturnType<typeof useConnectModal>)
  mockUseAccount.mockReturnValue({
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
  mockUseMarkets.mockReturnValue({
    data: MOCK_MARKETS,
    isLoading: false,
    error: null,
  })
  mockUseMarketPosition.mockImplementation((id: string) => ({
    data: positionOnPxwhsk(id),
    isLoading: false,
    error: null,
  }))
})

// Covers R7, R12, R15.
describe('BorrowList', () => {
  it('lists each pool with the user collateral, debt, and health', () => {
    render(<BorrowList />)
    expect(screen.getAllByText('Your collateral')).toHaveLength(
      MOCK_MARKETS.length,
    )
    expect(screen.getByText('$8,000.00')).toBeTruthy()
    expect(screen.getByText('$3,172.00')).toBeTruthy()
    expect(screen.getByText('1.89')).toBeTruthy()
  })

  it('shows a connect prompt instead of a position when disconnected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
    } as unknown as ReturnType<typeof useAccount>)
    render(<BorrowList />)
    expect(screen.getAllByText(/Connect a wallet/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Your collateral')).toBeNull()
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

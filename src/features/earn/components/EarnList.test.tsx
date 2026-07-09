import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketPosition } from '#/features/position/hooks/usePosition'
import { EarnList } from './EarnList'

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

const suppliedOnPxwhsk = (id: string): MarketPosition =>
  id === 'pxwhsk'
    ? {
        supplies: [
          {
            symbol: 'pxUSDT',
            balance: 0n,
            decimals: 6,
            valueUsd: 12_500,
            apy: 5,
          },
        ],
        borrows: [],
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
    data: suppliedOnPxwhsk(id),
    isLoading: false,
    error: null,
  }))
})

// Covers R5, R12, R15.
describe('EarnList', () => {
  it('lists every pool with its Supply APY and the user supplied balance', () => {
    render(<EarnList />)
    expect(screen.getAllByText('Supply APY')).toHaveLength(MOCK_MARKETS.length)
    // pxWHSK pool shows the user's supplied pxUSDT liquidity.
    expect(screen.getByText('$12,500.00')).toBeTruthy()
  })

  it('shows a connect prompt instead of a zero balance when disconnected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
    } as unknown as ReturnType<typeof useAccount>)
    render(<EarnList />)
    expect(screen.getAllByText(/Connect a wallet/).length).toBeGreaterThan(0)
    expect(screen.queryByText('$0.00')).toBeNull()
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

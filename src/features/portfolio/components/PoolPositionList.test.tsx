import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MOCK_MARKETS } from '#/features/markets/mock'
import type { MarketPosition } from '#/features/position/hooks/usePosition'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { PoolPositionList } from './PoolPositionList'

vi.mock('#/features/markets/hooks/useMarkets', () => ({ useMarkets: vi.fn() }))
vi.mock('#/features/position/hooks/usePosition', () => ({
  useMarketPosition: vi.fn(),
}))

const mockUseMarkets = vi.mocked(useMarkets)
const mockUseMarketPosition = vi.mocked(useMarketPosition)

const [m0, m1] = MOCK_MARKETS

function posQuery(
  over: Partial<ReturnType<typeof useMarketPosition>>,
): ReturnType<typeof useMarketPosition> {
  return { data: null, isLoading: false, error: null, ...over }
}

const activePosition: MarketPosition = {
  supplies: [
    {
      symbol: m0.collateralSymbol,
      balance: 500n * 10n ** 18n,
      decimals: 18,
      valueUsd: 600,
      apy: 0,
    },
    {
      symbol: m0.borrowSymbol,
      balance: 1000n * 10n ** 6n,
      decimals: 6,
      valueUsd: 1000,
      apy: 4,
    },
  ],
  borrows: [
    {
      symbol: m0.borrowSymbol,
      debt: 400n * 10n ** 6n,
      decimals: 6,
      valueUsd: 400,
      apr: 5,
    },
  ],
  healthFactor: 1.08,
}

const emptyPosition: MarketPosition = { supplies: [], borrows: [] }

beforeEach(() => {
  mockUseMarkets.mockReturnValue({
    data: MOCK_MARKETS,
    isLoading: false,
    error: null,
  })
})

describe('PoolPositionList', () => {
  it('renders only the pools the user is in, scoped per pool (AE1)', async () => {
    mockUseMarketPosition.mockImplementation((id) =>
      posQuery({
        data: id === m0.id ? activePosition : emptyPosition,
      }),
    )

    render(<PoolPositionList />)

    // The active pool's card is present, with per-pool figures + HF zone.
    expect(
      await screen.findByText(`${m0.collateralSymbol} / ${m0.borrowSymbol}`),
    ).toBeTruthy()
    expect(screen.getByText('Collateral')).toBeTruthy()
    expect(screen.getByText('Supplied')).toBeTruthy()
    expect(screen.getByText('Debt')).toBeTruthy()
    // HF 1.08 lands in the danger zone (orange), scoped to this pool.
    expect(screen.getByLabelText('Health factor 1.08, Danger')).toBeTruthy()

    // The empty pool contributes no card.
    expect(
      screen.queryByText(`${m1.collateralSymbol} / ${m1.borrowSymbol}`),
    ).toBeNull()
  })

  it('shows the empty state when the user has no positions (AE6)', async () => {
    mockUseMarketPosition.mockImplementation(() =>
      posQuery({ data: emptyPosition }),
    )

    render(<PoolPositionList />)

    expect(await screen.findByText('No open positions')).toBeTruthy()
  })

  it('renders loading skeletons while positions load, with no empty flash', () => {
    mockUseMarketPosition.mockImplementation(() =>
      posQuery({ isLoading: true }),
    )

    const { container } = render(<PoolPositionList />)

    expect(screen.queryByText('No open positions')).toBeNull()
    expect(
      container.querySelectorAll('.motion-safe\\:animate-pulse').length,
    ).toBeGreaterThan(0)
  })

  it('renders an error state when a pool read fails', async () => {
    mockUseMarketPosition.mockImplementation((id) =>
      posQuery({
        data: id === m0.id ? null : emptyPosition,
        error: id === m0.id ? new Error('rpc down') : null,
      }),
    )

    render(<PoolPositionList />)

    expect(await screen.findByText(/Couldn't load this pool/i)).toBeTruthy()
  })
})

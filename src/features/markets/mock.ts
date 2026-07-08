import type { MarketView } from './types'

/**
 * Placeholder market data (U11). Stands in for the integration plan's
 * `useMarkets` hook so the UI is viewable now; the real adapter swaps in behind
 * this same shape with no component change.
 */
export const MOCK_MARKETS: MarketView[] = [
  {
    id: 'pxwhsk',
    collateralSymbol: 'pxWHSK',
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    supplyApy: 5.24,
    rewardsApy: 0.8,
    borrowApr: 7.8,
    utilization: 61,
    tvlUsd: 4_200_000,
    availableLiquidityUsd: 1_600_000,
    lltv: 80,
    oracle: 'TokenDataStream · WHSK/USD',
    priceUsd: 1.08,
  },
  {
    id: 'pxwbtc',
    collateralSymbol: 'pxWBTC',
    collateralDecimals: 8,
    borrowSymbol: 'pxUSDT',
    supplyApy: 3.91,
    borrowApr: 6.2,
    utilization: 44,
    tvlUsd: 9_800_000,
    availableLiquidityUsd: 5_500_000,
    lltv: 75,
    oracle: 'TokenDataStream · WBTC/USD',
    priceUsd: 96_400,
  },
  {
    id: 'pxweth',
    collateralSymbol: 'pxWETH',
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    supplyApy: 4.4,
    borrowApr: 6.9,
    utilization: 52,
    tvlUsd: 3_100_000,
    availableLiquidityUsd: 1_480_000,
    lltv: 78,
    oracle: 'TokenDataStream · WETH/USD',
    priceUsd: 3_320,
  },
  {
    id: 'pxwhsk-base',
    collateralSymbol: 'pxWHSK',
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    supplyApy: 5.61,
    rewardsApy: 1.2,
    borrowApr: 8.1,
    utilization: 66,
    tvlUsd: 1_240_000,
    availableLiquidityUsd: 420_000,
    lltv: 80,
    oracle: 'TokenDataStream · WHSK/USD',
    priceUsd: 1.08,
  },
]

export interface MockQuery<T> {
  data: T
  isLoading: boolean
  /** Widened so the error branch stays live — the real hook can reject. */
  error: unknown
}

export function useMarkets(): MockQuery<MarketView[]> {
  return { data: MOCK_MARKETS, isLoading: false, error: null }
}

export function useMarket(id: string): MockQuery<MarketView | undefined> {
  return {
    data: MOCK_MARKETS.find((market) => market.id === id),
    isLoading: false,
    error: null,
  }
}

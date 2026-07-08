import { MARKETS } from '#/lib/contracts'
import type { MarketConfig } from '#/lib/contracts'
import type { MarketView } from './types'

/**
 * Preview market data (U11). The market identity + risk params are the REAL
 * deployment (addresses, decimals, LTV/liq-threshold, IRM tier, seed price)
 * from src/lib/contracts; only the rate/utilization/TVL numbers below are
 * illustrative placeholders the integration plan's RPC reads will replace.
 */
interface Display {
  utilization: number
  tvlUsd: number
  availableLiquidityUsd: number
  rewardsApy?: number
}

const DISPLAY: Record<string, Display> = {
  pxwhsk: {
    utilization: 61,
    tvlUsd: 4_200_000,
    availableLiquidityUsd: 1_600_000,
    rewardsApy: 0.8,
  },
  pxwbtc: {
    utilization: 44,
    tvlUsd: 9_800_000,
    availableLiquidityUsd: 5_500_000,
  },
  pxweth: {
    utilization: 52,
    tvlUsd: 3_100_000,
    availableLiquidityUsd: 1_480_000,
  },
  'pxwhsk-xchain': {
    utilization: 66,
    tvlUsd: 1_240_000,
    availableLiquidityUsd: 420_000,
    rewardsApy: 1.2,
  },
}

function toView(market: MarketConfig): MarketView {
  const display = DISPLAY[market.id]
  // Illustrative borrow APR ≈ the market's rate-at-optimal; supply APY derived
  // from it, the shown utilization, and the reserve factor (same shape the real
  // InterestRateModel uses).
  const borrowApr = market.rateAtOptimal
  const supplyApy = Number(
    (
      borrowApr *
      (display.utilization / 100) *
      (1 - market.reserveFactor / 100)
    ).toFixed(2),
  )
  return {
    id: market.id,
    collateralSymbol: market.collateralSymbol,
    collateralDecimals: market.collateralDecimals,
    borrowSymbol: market.borrowSymbol,
    supplyApy,
    rewardsApy: display.rewardsApy,
    borrowApr,
    utilization: display.utilization,
    tvlUsd: display.tvlUsd,
    availableLiquidityUsd: display.availableLiquidityUsd,
    lltv: market.ltv,
    liqThreshold: market.liqThreshold,
    oracle: `TokenDataStream · ${market.collateralSymbol}/USD`,
    priceUsd: market.priceSeedUsd,
    poolAddress: market.pool,
    collateralAddress: market.collateralAddress,
    oracleFeed: market.oracleFeed,
    crossChain: market.crossChain,
  }
}

export const MOCK_MARKETS: MarketView[] = MARKETS.map(toView)

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

/**
 * Market read hooks (U5). Derives the UI market view-models from the chain
 * adapter's live reads (pool totals, borrow rate, price) + `src/lib/math` — in
 * mock mode the adapter serves fixtures, so swapping to live (U18) needs no
 * change here or in the components (R11, R13).
 */
import { useQuery } from '@tanstack/react-query'
import { MARKETS, TOKENS } from '#/lib/contracts'
import type { MarketConfig } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { ChainAdapter } from '#/lib/data'
import {
  WAD,
  availableLiquidity,
  supplyRateWad,
  toWholeNumber,
  utilizationWad,
  wadToPercent,
} from '#/lib/math'
import type { QueryResult } from '#/features/shared/query'
import type { MarketView } from '../types'

/** pxUSDT (the borrow token) decimals — read from config, never hardcoded. */
const BORROW_DECIMALS = TOKENS.pxUSDT.decimals

/** Off-chain incentive rewards (not on-chain) — illustrative until a rewards
 *  source exists; keyed by market id. */
const REWARDS_APY: Record<string, number | undefined> = {
  pxwhsk: 0.8,
  'pxwhsk-xchain': 1.2,
}

async function deriveMarketView(
  config: MarketConfig,
  chain: ChainAdapter,
): Promise<MarketView> {
  const [totals, borrowRateWad, price] = await Promise.all([
    chain.getMarketTotals(config.pool),
    chain.getBorrowRateWad(config.pool),
    chain.getPrice(config.collateralAddress),
  ])

  const utilWad = utilizationWad(
    totals.totalBorrowAssets,
    totals.totalSupplyAssets,
  )
  const reserveWad = (BigInt(config.reserveFactor) * WAD) / 100n
  const supplyRate = supplyRateWad(borrowRateWad, utilWad, reserveWad)
  const available = availableLiquidity(
    totals.totalSupplyAssets,
    totals.totalBorrowAssets,
  )

  return {
    id: config.id,
    collateralSymbol: config.collateralSymbol,
    collateralDecimals: config.collateralDecimals,
    borrowSymbol: config.borrowSymbol,
    supplyApy: wadToPercent(supplyRate),
    rewardsApy: REWARDS_APY[config.id],
    borrowApr: wadToPercent(borrowRateWad),
    utilization: wadToPercent(utilWad),
    // Borrow token is pxUSDT (~$1), so borrow-token units ≈ USD for display.
    tvlUsd: toWholeNumber(totals.totalSupplyAssets, BORROW_DECIMALS),
    availableLiquidityUsd: toWholeNumber(available, BORROW_DECIMALS),
    lltv: config.ltv,
    liqThreshold: config.liqThreshold,
    oracle: `TokenDataStream · ${config.collateralSymbol}/USD`,
    priceUsd: toWholeNumber(price.price, 8),
    poolAddress: config.pool,
    collateralAddress: config.collateralAddress,
    oracleFeed: config.oracleFeed,
    crossChain: config.crossChain,
  }
}

function loadMarkets(): Promise<MarketView[]> {
  const { chain } = getAdapters()
  return Promise.all(MARKETS.map((config) => deriveMarketView(config, chain)))
}

export function useMarkets(): QueryResult<MarketView[]> {
  const query = useQuery({ queryKey: ['markets'], queryFn: loadMarkets })
  return { data: query.data ?? [], isLoading: query.isLoading, error: query.error }
}

export function useMarket(id: string): QueryResult<MarketView | undefined> {
  const { data, isLoading, error } = useMarkets()
  return { data: data.find((market) => market.id === id), isLoading, error }
}

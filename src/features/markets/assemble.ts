/**
 * The pure indexer-record → `MarketView` assembly (U5). Kept out of the hook so
 * both `usePools` (live path) and `mock.ts` (fixtures) build identically-shaped
 * view models — otherwise the list-component tests would pass against a model the
 * app no longer produces.
 *
 * Every size-derived field is left `undefined` when the pool's size is unknown,
 * and `priceUsd` is `undefined` when the feed is unavailable — a cell renders an
 * em dash rather than a lying zero (R9, R27).
 */
import { CROSS_CHAIN } from '#/lib/contracts'
import type { PoolSize, RawPool, TokenPrice } from '#/lib/data'
import {
  availableLiquidity,
  supplyRateWad,
  toWholeNumber,
  utilizationWad,
  wadToPercent,
} from '#/lib/math'
import type { MarketView } from './types'

const XC_BRIDGE_TOKEN = CROSS_CHAIN.bridgeToken.hashkey.toLowerCase()

/** Feed prices are 8-dp USD (1e8 = $1). */
const PRICE_DECIMALS = 8

export function assembleMarketView(
  pool: RawPool,
  size: PoolSize,
  price: TokenPrice,
  collateralDecimals: number,
  borrowDecimals: number,
): MarketView {
  let supplyApy: number | undefined
  let borrowApr: number | undefined
  let utilization: number | undefined
  let tvlUsd: number | undefined
  let availableLiquidityUsd: number | undefined
  let totalSupplyAssets: bigint | undefined
  let totalBorrowAssets: bigint | undefined

  if (size.known) {
    const utilWad = utilizationWad(
      size.totalBorrowAssets,
      size.totalSupplyAssets,
    )
    const supplyRate = supplyRateWad(
      size.borrowRateWad,
      utilWad,
      pool.reserveFactorWad,
    )
    const available = availableLiquidity(
      size.totalSupplyAssets,
      size.totalBorrowAssets,
    )
    supplyApy = wadToPercent(supplyRate)
    borrowApr = wadToPercent(size.borrowRateWad)
    utilization = wadToPercent(utilWad)
    // Every pool borrows pxUSDT (~$1), so borrow-token units ≈ USD for display.
    tvlUsd = toWholeNumber(size.totalSupplyAssets, borrowDecimals)
    availableLiquidityUsd = toWholeNumber(available, borrowDecimals)
    totalSupplyAssets = size.totalSupplyAssets
    totalBorrowAssets = size.totalBorrowAssets
  }

  const priceUsd = price.available
    ? toWholeNumber(price.data.price, PRICE_DECIMALS)
    : undefined

  return {
    id: pool.lendingPool.toLowerCase(),
    poolAddress: pool.lendingPool,
    collateralSymbol: pool.collateralTokenFormatted,
    collateralAddress: pool.collateralToken,
    collateralDecimals,
    borrowSymbol: pool.borrowTokenFormatted,
    borrowAddress: pool.borrowToken,
    borrowDecimals,
    supplyApy,
    borrowApr,
    utilization,
    tvlUsd,
    availableLiquidityUsd,
    priceUsd,
    totalSupplyAssets,
    totalBorrowAssets,
    priceStale: !price.available,
    sizeKnown: size.known,
    lltv: wadToPercent(pool.ltv),
    liqThreshold: wadToPercent(pool.liquidationThreshold),
    oracle: `TokenDataStream · ${pool.collateralTokenFormatted}/USD`,
    crossChain: pool.collateralToken.toLowerCase() === XC_BRIDGE_TOKEN,
  }
}

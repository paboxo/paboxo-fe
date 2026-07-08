import type { Address } from '#/lib/contracts'

/** UI-facing market view-model. Real fields come from src/lib/contracts; the
 *  live rate/util/TVL numbers are filled by the integration plan's RPC reads. */
export interface MarketView {
  id: string
  collateralSymbol: string
  collateralDecimals: number
  borrowSymbol: string
  supplyApy: number
  rewardsApy?: number
  borrowApr: number
  utilization: number
  tvlUsd: number
  availableLiquidityUsd: number
  /** Loan-to-value (%). */
  lltv: number
  /** Liquidation threshold (%). */
  liqThreshold: number
  oracle: string
  priceUsd: number
  /** Real deployed addresses (from the contracts config). */
  poolAddress: Address
  collateralAddress: Address
  oracleFeed: Address
  crossChain: boolean
}

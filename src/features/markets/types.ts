/** UI-facing market view-model (integration plan supplies the real data behind these shapes). */
export interface MarketView {
  id: string
  collateralSymbol: string
  borrowSymbol: string
  supplyApy: number
  rewardsApy?: number
  borrowApr: number
  utilization: number
  tvlUsd: number
  availableLiquidityUsd: number
  lltv: number
  oracle: string
  /** Collateral price in USD. */
  priceUsd: number
}

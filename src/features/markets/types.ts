import type { Address } from '#/lib/contracts'

/**
 * UI-facing pool view-model (U5). Built by `usePools` from the indexer records,
 * the token registry, and the on-chain enrichment reads.
 *
 * Size- and price-derived fields are `number | undefined` on purpose: an
 * `undefined` says "unavailable" (the enrichment read failed) and a cell renders
 * an em dash — never a zero that lies. Genuinely-zero values stay `0`. The raw
 * `bigint` totals ride along so the sort comparators can order by pool size
 * without a display round-trip.
 */
export interface MarketView {
  /** The **lowercased pool address** — the routable identity (no more slug). */
  id: string
  /** The LendingPool address (writes target this). */
  poolAddress: Address
  collateralSymbol: string
  collateralAddress: Address
  /** Runtime-verified collateral-token decimals (from the enrichment result). */
  collateralDecimals: number
  borrowSymbol: string
  borrowAddress: Address
  /** Runtime-verified borrow-token decimals — feeds `parseUnits` on write forms. */
  borrowDecimals: number

  /** Net supply APY (%). `undefined` when the pool's size is unknown. */
  supplyApy: number | undefined
  /** Borrow APR (%). `undefined` when the pool's size is unknown. */
  borrowApr: number | undefined
  /** Utilization (%). `undefined` when the pool's size is unknown. */
  utilization: number | undefined
  /** Total supplied, USD. `undefined` when the pool's size is unknown. */
  tvlUsd: number | undefined
  /** Free liquidity, USD. `undefined` when the pool's size is unknown. */
  availableLiquidityUsd: number | undefined
  /** Collateral price, USD. `undefined` when the price feed is unavailable. */
  priceUsd: number | undefined

  /** Raw borrow-token-denominated totals, for size sorting. */
  totalSupplyAssets: bigint | undefined
  totalBorrowAssets: bigint | undefined

  /** The collateral token's price was unavailable (price-derived cells em-dash). */
  priceStale: boolean
  /** The pool's balance reads succeeded — `false` sorts the pool last, distinct
   *  from a genuinely zero-supply pool. */
  sizeKnown: boolean

  /** Loan-to-value (%). */
  lltv: number
  /** Liquidation threshold (%). */
  liqThreshold: number
  oracle: string
  crossChain: boolean
}

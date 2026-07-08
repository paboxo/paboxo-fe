/** UI-facing position view-models. Built by `hooks/usePosition.ts` from the
 *  chain adapter's live reads + src/lib/math. */

export interface SupplyRow {
  symbol: string
  balance: bigint
  decimals: number
  valueUsd: number
  apy: number
}

export interface BorrowRow {
  symbol: string
  debt: bigint
  decimals: number
  valueUsd: number
  apr: number
}

export interface PositionView {
  netWorthUsd: number
  netApy: number
  healthFactor: number
  liquidationAsset?: string
  currentPrice?: number
  liquidationPrice?: number
  supplies: SupplyRow[]
  borrows: BorrowRow[]
}

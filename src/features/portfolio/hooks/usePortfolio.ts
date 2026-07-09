/**
 * Cross-pool portfolio summary (U3). Derives category totals — lender deposits,
 * collateral, and loans — plus net worth from the user's aggregated position.
 * `usePosition` already spans every market, so this is an additive derivation:
 * no rewrite of the position/markets read path.
 */
import type { QueryResult } from '#/features/shared/query'
import { usePosition } from '#/features/position/hooks/usePosition'
import type { PositionView } from '#/features/position/types'

/** All markets borrow pxUSDT; a supply in pxUSDT is a lender deposit, anything
 *  else is collateral. */
const BORROW_SYMBOL = 'pxUSDT'

export interface PortfolioSummary {
  /** Lender supplies (the borrow token). */
  depositsUsd: number
  /** Collateral supplied against loans. */
  collateralUsd: number
  /** Outstanding debt. */
  loansUsd: number
  netWorthUsd: number
  /** Number of supply + borrow line items across all pools. */
  positionsCount: number
}

function summarize(position: PositionView): PortfolioSummary {
  const depositsUsd = position.supplies
    .filter((row) => row.symbol === BORROW_SYMBOL)
    .reduce((sum, row) => sum + row.valueUsd, 0)
  const collateralUsd = position.supplies
    .filter((row) => row.symbol !== BORROW_SYMBOL)
    .reduce((sum, row) => sum + row.valueUsd, 0)
  const loansUsd = position.borrows.reduce((sum, row) => sum + row.valueUsd, 0)
  return {
    depositsUsd,
    collateralUsd,
    loansUsd,
    netWorthUsd: position.netWorthUsd,
    positionsCount: position.supplies.length + position.borrows.length,
  }
}

export function usePortfolio(): QueryResult<PortfolioSummary | null> {
  const { data, isLoading, error } = usePosition()
  return {
    data: data ? summarize(data) : null,
    isLoading,
    error,
  }
}

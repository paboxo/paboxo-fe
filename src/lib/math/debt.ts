/**
 * Borrow-side accounting (U4). Appendix formula: current debt in borrow-token
 * units (pxUSDT, 6dp) from a user's borrow shares and the pool totals.
 */
import { mulDiv } from './units'

/** `debt = userBorrowShares × totalBorrowAssets / totalBorrowShares`
 *  (0 when `totalBorrowShares == 0`). */
export function currentDebt(
  userBorrowShares: bigint,
  totalBorrowAssets: bigint,
  totalBorrowShares: bigint,
): bigint {
  return mulDiv(userBorrowShares, totalBorrowAssets, totalBorrowShares)
}

/** Inverse: debt shares to burn to repay `assets` of the borrow token —
 *  `shares = assets × totalBorrowShares / totalBorrowAssets`. Used to size a
 *  repay/liquidation approval from a live asset amount (0 when the pool has no
 *  borrow assets). */
export function debtSharesForAssets(
  assets: bigint,
  totalBorrowAssets: bigint,
  totalBorrowShares: bigint,
): bigint {
  return mulDiv(assets, totalBorrowShares, totalBorrowAssets)
}

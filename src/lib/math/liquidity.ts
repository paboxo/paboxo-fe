/**
 * Available pool liquidity (U4) — gates borrow and withdraw.
 */

/** `totalSupplyAssets − totalBorrowAssets`, floored at 0. */
export function availableLiquidity(
  totalSupplyAssets: bigint,
  totalBorrowAssets: bigint,
): bigint {
  return totalSupplyAssets > totalBorrowAssets
    ? totalSupplyAssets - totalBorrowAssets
    : 0n
}

/**
 * Utilization + supply-rate derivation (U4). All rates are WAD (1e18 = 100%).
 */
import { WAD, mulDiv } from './units'

/** `totalBorrowAssets × 1e18 / totalSupplyAssets` (0 when `totalSupplyAssets == 0`). */
export function utilizationWad(
  totalBorrowAssets: bigint,
  totalSupplyAssets: bigint,
): bigint {
  return mulDiv(totalBorrowAssets, WAD, totalSupplyAssets)
}

/** `supplyRate ≈ borrowRate × utilization × (1 − reserveFactor)`, all WAD. */
export function supplyRateWad(
  borrowRateWad: bigint,
  utilizationWadValue: bigint,
  reserveFactorWad: bigint,
): bigint {
  const afterUtil = mulDiv(borrowRateWad, utilizationWadValue, WAD)
  return mulDiv(afterUtil, WAD - reserveFactorWad, WAD)
}

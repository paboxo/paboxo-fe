/**
 * Supply-side accounting (U4). Lender supply shares (18dp) ↔ borrow-token value.
 * There is no direct `totalSupplyShares` getter — it is derived (Appendix).
 */
import { WAD, mulDiv, pow10 } from './units'

/** Supply value in borrow-token units: `shares × totalSupplyAssets / totalSupplyShares`. */
export function supplyValue(
  shares: bigint,
  totalSupplyAssets: bigint,
  totalSupplyShares_: bigint,
): bigint {
  return mulDiv(shares, totalSupplyAssets, totalSupplyShares_)
}

/** Derived total supply shares: `sharesToken.totalSupply() × 10^underlyingDecimals / 1e18`. */
export function totalSupplyShares(
  sharesTokenTotalSupply: bigint,
  underlyingDecimals: number,
): bigint {
  return (sharesTokenTotalSupply * pow10(underlyingDecimals)) / WAD
}

/** Shares that a supply of `assets` would mint. An empty pool mints 1:1, so any
 *  positive amount mints; otherwise `assets × totalSupplyShares / totalSupplyAssets`.
 *  A result of 0 means the amount is too small to mint a share (blocked pre-send). */
export function supplySharesForAssets(
  assets: bigint,
  totalSupplyAssets: bigint,
  totalSupplyShares_: bigint,
): bigint {
  if (totalSupplyAssets === 0n || totalSupplyShares_ === 0n) return assets
  return mulDiv(assets, totalSupplyShares_, totalSupplyAssets)
}

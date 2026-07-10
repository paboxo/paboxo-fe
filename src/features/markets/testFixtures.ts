/**
 * Shared `MarketView` fixture for list-surface tests.
 *
 * `EarnList` and `BorrowList` assert the *same* pool data through two different
 * comparators, so they must build it from one factory — otherwise the fixtures
 * drift and the two surfaces stop being compared on equal terms.
 */
import type { Address } from '#/lib/contracts'
import type { MarketView } from './types'

/** Real registry addresses, so `TokenGlyph` resolves an actual logo. */
export const PX_WHSK = '0xc3be8ab4CA0cefE3119A765b324bBDF54a16A65b' as Address
export const PX_USDT = '0x4852Bc014401415C4CE4788A04cAB019d1527aAa' as Address

/** A fully-formed pool view; each test overrides only the fields it asserts on. */
export function makeMarket(
  overrides: Partial<MarketView> & { id: string },
): MarketView {
  return {
    poolAddress: overrides.id as Address,
    collateralSymbol: 'pxWHSK',
    collateralAddress: PX_WHSK,
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    borrowAddress: PX_USDT,
    borrowDecimals: 6,
    supplyApy: 4,
    borrowApr: 6,
    utilization: 50,
    tvlUsd: 1000,
    availableLiquidityUsd: 500,
    priceUsd: 1,
    totalSupplyAssets: 100n,
    totalBorrowAssets: 0n,
    priceStale: false,
    sizeKnown: true,
    lltv: 80,
    liqThreshold: 85,
    oracle: '0xoracle',
    crossChain: false,
    ...overrides,
  }
}

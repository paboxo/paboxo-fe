import { describe, expect, it } from 'vitest'
import type { MarketView } from './types'
import { byAvailableLiquidity, bySupply } from './sort'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

/** A minimal size-bearing pool; only the sort-relevant fields matter here. */
function pool(
  id: `0x${string}`,
  size:
    | { supply: bigint; borrow: bigint }
    | 'unknown',
): MarketView {
  const known = size !== 'unknown'
  return {
    id,
    poolAddress: id,
    collateralSymbol: 'pxX',
    collateralAddress: ZERO_ADDR,
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    borrowAddress: ZERO_ADDR,
    borrowDecimals: 6,
    supplyApy: known ? 1 : undefined,
    borrowApr: known ? 1 : undefined,
    utilization: known ? 1 : undefined,
    tvlUsd: known ? 1 : undefined,
    availableLiquidityUsd: known ? 1 : undefined,
    priceUsd: 1,
    totalSupplyAssets: known ? size.supply : undefined,
    totalBorrowAssets: known ? size.borrow : undefined,
    priceStale: false,
    sizeKnown: known,
    lltv: 70,
    liqThreshold: 75,
    oracle: 'x',
    crossChain: false,
  }
}

describe('bySupply', () => {
  it('orders by total supply descending, then pool address ascending, unknown last', () => {
    const big = pool('0xb', { supply: 900n, borrow: 100n })
    const smallA = pool('0xa', { supply: 100n, borrow: 0n })
    const smallC = pool('0xc', { supply: 100n, borrow: 0n })
    const zero = pool('0xd', { supply: 0n, borrow: 0n })
    const unknown = pool('0xe', 'unknown')

    const sorted = [unknown, zero, smallC, smallA, big]
      .slice()
      .sort(bySupply)
      .map((m) => m.id)

    // big first; the two equal-supply pools break the tie by address (a before c);
    // the zero-supply pool ranks above the unknown-size pool, which is last.
    expect(sorted).toEqual(['0xb', '0xa', '0xc', '0xd', '0xe'])
  })
})

describe('byAvailableLiquidity', () => {
  it('ranks a fully-borrowed large pool below a smaller pool with free liquidity', () => {
    const drained = pool('0xa', { supply: 1_000n, borrow: 1_000n }) // 0 free
    const smaller = pool('0xb', { supply: 200n, borrow: 50n }) // 150 free

    const sorted = [drained, smaller].slice().sort(byAvailableLiquidity)
    expect(sorted.map((m) => m.id)).toEqual(['0xb', '0xa'])
  })

  it('breaks ties by address and sorts unknown-size pools last', () => {
    const freeA = pool('0xa', { supply: 200n, borrow: 100n }) // 100 free
    const freeC = pool('0xc', { supply: 200n, borrow: 100n }) // 100 free
    const unknown = pool('0xb', 'unknown')

    const sorted = [unknown, freeC, freeA].slice().sort(byAvailableLiquidity)
    expect(sorted.map((m) => m.id)).toEqual(['0xa', '0xc', '0xb'])
  })
})

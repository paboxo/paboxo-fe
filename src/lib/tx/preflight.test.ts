import { describe, expect, it } from 'vitest'
import {
  PRICE_MAX_AGE_SECONDS,
  isPriceStale,
  preflightBorrow,
  preflightLiquidate,
  preflightSupply,
  preflightWithdraw,
} from './preflight'

const NOW = 1_720_000_000
const FRESH = NOW - 60 // updated a minute ago

// Covers R9, R10, AE1, AE3, AE5.
describe('isPriceStale', () => {
  it('flags a feed older than 1h', () => {
    expect(isPriceStale(NOW - PRICE_MAX_AGE_SECONDS - 1, NOW)).toBe(true)
    expect(isPriceStale(NOW - PRICE_MAX_AGE_SECONDS + 1, NOW)).toBe(false)
  })
})

describe('preflightSupply', () => {
  const base = {
    totalSupplyAssets: 2_600_000_000000n,
    totalSupplyShares: 2_600_000_000000n,
    priceUpdatedAt: FRESH,
    nowSeconds: NOW,
  }

  it('allows a normal supply', () => {
    expect(preflightSupply({ ...base, amount: 1_000_000n }).enabled).toBe(true)
  })

  it('rejects an amount that would mint 0 shares', () => {
    // Pool where 1 asset unit rounds to 0 shares (shares far scarcer than assets).
    const result = preflightSupply({
      amount: 1n,
      totalSupplyAssets: 1_000_000_000000n,
      totalSupplyShares: 1n,
      priceUpdatedAt: FRESH,
      nowSeconds: NOW,
    })
    expect(result.enabled).toBe(false)
    expect(result.reason).toMatch(/mint a share/)
  })

  it('rejects a zero amount', () => {
    expect(preflightSupply({ ...base, amount: 0n }).enabled).toBe(false)
  })

  it('blocks on a stale price (AE1)', () => {
    const result = preflightSupply({
      ...base,
      amount: 1_000_000n,
      priceUpdatedAt: NOW - PRICE_MAX_AGE_SECONDS - 10,
    })
    expect(result.enabled).toBe(false)
    expect(result.reason).toMatch(/stale/)
  })
})

describe('preflightBorrow', () => {
  it('blocks a borrow above available liquidity even when under max-borrow (AE3)', () => {
    const result = preflightBorrow({
      amount: 500_000_000n, // 500 pxUSDT
      maxBorrowAmount: 1_000_000_000n, // borrowing power is higher...
      availableLiquidity: 100_000_000n, // ...but the pool only has 100 free
      priceUpdatedAt: FRESH,
      nowSeconds: NOW,
    })
    expect(result.enabled).toBe(false)
    expect(result.reason).toMatch(/liquidity/)
  })

  it('blocks a borrow above max-borrow', () => {
    const result = preflightBorrow({
      amount: 2_000_000_000n,
      maxBorrowAmount: 1_000_000_000n,
      availableLiquidity: 10_000_000_000n,
      priceUpdatedAt: FRESH,
      nowSeconds: NOW,
    })
    expect(result.enabled).toBe(false)
    expect(result.reason).toMatch(/borrowing power/)
  })

  it('blocks a delegated borrow with no prior delegation (AE5)', () => {
    const result = preflightBorrow({
      amount: 100n,
      maxBorrowAmount: 1_000_000_000n,
      availableLiquidity: 1_000_000_000n,
      priceUpdatedAt: FRESH,
      nowSeconds: NOW,
      onBehalf: true,
      hasDelegation: false,
    })
    expect(result.enabled).toBe(false)
    expect(result.reason).toMatch(/delegation/)
  })

  it('allows a self-borrow within power and liquidity', () => {
    expect(
      preflightBorrow({
        amount: 100_000_000n,
        maxBorrowAmount: 1_000_000_000n,
        availableLiquidity: 1_000_000_000n,
        priceUpdatedAt: FRESH,
        nowSeconds: NOW,
      }).enabled,
    ).toBe(true)
  })
})

describe('preflightWithdraw', () => {
  it('blocks a withdraw that would leave the position unhealthy', () => {
    const result = preflightWithdraw({
      amount: 1_000_000n,
      currentDebt: 800_000_000n,
      maxBorrowAfterWithdraw: 500_000_000n, // debt would exceed post-withdraw power
      priceUpdatedAt: FRESH,
      nowSeconds: NOW,
    })
    expect(result.enabled).toBe(false)
    expect(result.reason).toMatch(/unhealthy/)
  })

  it('allows a withdraw the position can absorb', () => {
    expect(
      preflightWithdraw({
        amount: 1_000_000n,
        currentDebt: 100_000_000n,
        maxBorrowAfterWithdraw: 500_000_000n,
        priceUpdatedAt: FRESH,
        nowSeconds: NOW,
      }).enabled,
    ).toBe(true)
  })
})

describe('preflightLiquidate', () => {
  it('blocks liquidation of a healthy borrower', () => {
    const result = preflightLiquidate({
      liquidatable: false,
      priceUpdatedAt: FRESH,
      nowSeconds: NOW,
    })
    expect(result.enabled).toBe(false)
    expect(result.reason).toMatch(/healthy/)
  })

  it('allows liquidation of an unhealthy borrower on a fresh price', () => {
    expect(
      preflightLiquidate({
        liquidatable: true,
        priceUpdatedAt: FRESH,
        nowSeconds: NOW,
      }).enabled,
    ).toBe(true)
  })
})

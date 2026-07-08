import { describe, expect, it } from 'vitest'
import { currentDebt, debtSharesForAssets } from './debt'

// Covers R9: the debt formula (Appendix) and its inverse, on raw integer units.
describe('currentDebt', () => {
  it('is shares × totalBorrowAssets / totalBorrowShares', () => {
    // 3,000 shares of a pool with 1,586,000 assets / 1,500,000 shares (6dp).
    const debt = currentDebt(3_000_000_000n, 1_586_000_000000n, 1_500_000_000000n)
    expect(debt).toBe((3_000_000_000n * 1_586_000_000000n) / 1_500_000_000000n)
  })

  it('is 0 when totalBorrowShares == 0 (empty pool, no divide-by-zero)', () => {
    expect(currentDebt(5n, 1_000n, 0n)).toBe(0n)
  })

  it('is decimal-agnostic — same ratio math regardless of token decimals', () => {
    // 8-dp collateral-style inputs produce the same proportional result.
    expect(currentDebt(100n, 200n, 50n)).toBe(400n)
    expect(currentDebt(1n, 1n, 1n)).toBe(1n)
  })
})

describe('debtSharesForAssets', () => {
  it('inverts currentDebt: assets × totalBorrowShares / totalBorrowAssets', () => {
    const shares = debtSharesForAssets(500_000_000n, 1_586_000_000000n, 1_500_000_000000n)
    expect(shares).toBe((500_000_000n * 1_500_000_000000n) / 1_586_000_000000n)
  })

  it('is 0 when the pool has no borrow assets', () => {
    expect(debtSharesForAssets(100n, 0n, 500n)).toBe(0n)
  })
})

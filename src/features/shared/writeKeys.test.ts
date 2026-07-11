import { describe, expect, it } from 'vitest'
import type { QueryKey } from '@tanstack/react-query'
import { WRITE_INVALIDATE_KEYS } from './writeKeys'

/**
 * Mirrors TanStack Query's partial (prefix) key matching: a query is
 * invalidated when one of the invalidate keys is a prefix of the query key.
 */
const prefixMatches = (prefix: QueryKey, key: QueryKey): boolean =>
  (prefix as unknown[]).every((seg, i) => (key as unknown[])[i] === seg)

const coversSome = (queryKey: QueryKey): boolean =>
  WRITE_INVALIDATE_KEYS.some((k) => prefixMatches(k, queryKey))

describe('WRITE_INVALIDATE_KEYS', () => {
  it('covers wallet balance queries so the header refreshes after a write', () => {
    expect(coversSome(['token-balances', '0xabc'])).toBe(true)
    expect(coversSome(['token-balance', '0xtok', '0xabc'])).toBe(true)
  })

  it('covers per-market position, which ["position"] does not prefix-match', () => {
    // Regression guard: this key stayed stale after supplying collateral.
    expect(coversSome(['market-position', '0xpool', '0xabc'])).toBe(true)
    const positionOnly: QueryKey = ['position']
    expect(prefixMatches(positionOnly, ['market-position', '0xpool', '0xabc'])).toBe(
      false,
    )
  })

  it('covers the swap panel position balances, which ["position"] does not match', () => {
    // Regression guard: the swap collateral balances stayed stale after a swap
    // because ["position"] does not prefix-match these distinct heads.
    expect(coversSome(['position-balances', '0xpool', '0xpos'])).toBe(true)
    expect(coversSome(['position-address', '0xpool', '0xabc'])).toBe(true)
    expect(
      coversSome(['position-token-balance', '0xpool', '0xtok', '0xpos']),
    ).toBe(true)
    expect(
      prefixMatches(['position'], ['position-balances', '0xpool', '0xpos']),
    ).toBe(false)
  })

  it('covers allowances so a spent approval refreshes', () => {
    expect(coversSome(['allowances', '0xpool', '0xabc'])).toBe(true)
  })

  it('retains the original market/position/protocol keys', () => {
    for (const key of [['markets'], ['position'], ['protocol-stats']]) {
      expect(
        WRITE_INVALIDATE_KEYS.some(
          (k) => JSON.stringify(k) === JSON.stringify(key),
        ),
      ).toBe(true)
    }
  })
})

/**
 * Backward-compat shim (U5). The real logic moved to `usePools.ts`; the pool
 * model became address-identified and its numeric fields became `undefined`-able.
 *
 * These thin wrappers keep the pre-U5 call sites in `src/features/earn/**`,
 * `src/features/borrow/**`, and `src/routes/**` compiling untouched — U6 (routes)
 * and U8 (lists) migrate them onto `usePools` / `usePool` and retire this file.
 * They deliberately return the *narrow* `QueryResult` so those call sites (and
 * their `mockReturnValue` test doubles) are unaffected by the `sharedTokenFailed`
 * signal `usePools` adds.
 */
import type { QueryResult } from '#/features/shared/query'
import type { MarketView } from '../types'
import { usePools } from './usePools'

export function useMarkets(): QueryResult<MarketView[]> {
  const { data, isLoading, error } = usePools()
  return { data, isLoading, error }
}

/**
 * Legacy single-pool selector, kept as a narrow `QueryResult`. U6 moved the
 * detail routes onto `usePool`'s discriminated result, so this shim now selects
 * straight off `usePools()` rather than through `usePool` — matching is
 * case-insensitive against the pool-address id, so a legacy slug simply resolves
 * to `undefined` here.
 */
export function useMarket(id: string): QueryResult<MarketView | undefined> {
  const { data, isLoading, error } = usePools()
  const target = id.toLowerCase()
  return { data: data.find((market) => market.id === target), isLoading, error }
}

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
import type { Address } from '#/lib/contracts'
import type { QueryResult } from '#/features/shared/query'
import type { MarketView } from '../types'
import { usePool, usePools } from './usePools'

export function useMarkets(): QueryResult<MarketView[]> {
  const { data, isLoading, error } = usePools()
  return { data, isLoading, error }
}

/**
 * Legacy single-pool selector. New identity is the pool address; U6 switches the
 * routes onto `usePool(address)`. Matching is case-insensitive against the
 * pool-address id, so a legacy slug simply resolves to `undefined` here.
 */
export function useMarket(id: string): QueryResult<MarketView | undefined> {
  const { data, isLoading, error } = usePool(id as Address)
  return { data, isLoading, error }
}

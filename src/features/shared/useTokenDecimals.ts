/**
 * Runtime-verified token decimals for surfaces that have no pool to read them
 * from (U14, R31).
 *
 * `enrichPools([])` is the whole trick: with an empty pool list the router phase
 * is skipped and the batch still reads `decimals()` for every registry token, so
 * one multicall answers the question without a new adapter method.
 *
 * Returns `undefined` when the value could not be verified — the caller must
 * refuse to submit rather than fall back to the registry constant, which is the
 * unverified number `R8` exists to distrust.
 */
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'

export interface VerifiedDecimalsResult {
  /** The verified value, or `undefined` while loading or when unverifiable. */
  decimals: number | undefined
  isLoading: boolean
  error: unknown
}

export function useTokenDecimals(token: Address): VerifiedDecimalsResult {
  const query = useQuery({
    queryKey: ['token-decimals'],
    queryFn: () => getAdapters().chain.enrichPools([]),
  })

  const verdict = query.data?.tokens[token.toLowerCase()]?.decimals

  return {
    decimals: verdict?.valid === true ? verdict.decimals : undefined,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Pool read hooks (U5). One `useQuery` joins the indexer's `getPools()` records,
 * the token registry, and the chain adapter's batched enrichment into the
 * `MarketView[]` the UI consumes — so search, sort, and pagination downstream are
 * pure `useMemo` derivations over an already-fetched array (R17), and the detail
 * page selects from the same query rather than fetching again.
 *
 * Three zero-pool outcomes stay distinguishable for the consumer:
 *   - the query rejected (indexer fault)     → React Query `isError` / `error`
 *   - the shared borrow token failed          → `sharedTokenFailed`
 *   - the indexer legitimately returned none  → a plain empty array
 */
import { useQuery } from '@tanstack/react-query'
import { TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { PoolsEnrichment, RawPool, VerifiedDecimals } from '#/lib/data'
import { getTokenByAddress } from '#/lib/tokens/registry'
import type { QueryResult } from '#/features/shared/query'
import { assembleMarketView } from '../assemble'
import type { MarketView } from '../types'

/** The shared borrow token — every live pool borrows pxUSDT (AS1). */
const SHARED_BORROW_TOKEN = TOKENS.pxUSDT.address.toLowerCase()

/** `usePools`' result — the narrow shared shape plus the shared-token signal. */
export interface PoolsResult extends QueryResult<MarketView[]> {
  /** Validation removed every pool because pxUSDT failed — an error, not "empty". */
  sharedTokenFailed: boolean
}

/** The query function's payload — the views plus the shared-token verdict, which
 *  an empty `views` array alone cannot carry. */
interface PoolLoad {
  views: MarketView[]
  sharedTokenFailed: boolean
}

/** R11: warn once per unknown token address, in development only. */
const warnedUnknown = new Set<string>()
function warnUnknownToken(address: Address): void {
  if (!import.meta.env.DEV) return
  const key = address.toLowerCase()
  if (warnedUnknown.has(key)) return
  warnedUnknown.add(key)
  console.warn(
    `[pools] dropping a pool: token ${address} is absent from the registry`,
  )
}

/** R8: an unverifiable token is untrustworthy at any scale — log and drop. */
function logInvalidDecimals(address: Address, verdict: VerifiedDecimals): void {
  if (verdict.valid) return
  if (verdict.reason === 'mismatch') {
    console.error(
      `[pools] dropping pools for token ${address}: on-chain decimals ${verdict.onChain} disagree with the registry's ${verdict.registry}`,
    )
  } else {
    console.error(
      `[pools] dropping pools for token ${address}: decimals() could not be read (registry says ${verdict.registry})`,
    )
  }
}

async function loadPools(): Promise<PoolLoad> {
  const { chain, indexer } = getAdapters()

  // 1. May reject on an indexer fault — let React Query surface `isError` (R32).
  const raw = await indexer.getPools()

  // 2. R11: drop pools whose collateral OR borrow token the registry doesn't know.
  const known = raw.filter((p) => {
    const collateral = getTokenByAddress(p.collateralToken)
    const borrow = getTokenByAddress(p.borrowToken)
    if (!collateral) warnUnknownToken(p.collateralToken)
    if (!borrow) warnUnknownToken(p.borrowToken)
    return collateral !== undefined && borrow !== undefined
  })

  // 3. Batched on-chain enrichment — never rejects.
  const enrichment = await chain.enrichPools(known)

  // 4. R8: drop every pool using a token whose decimals could not be verified.
  const views: MarketView[] = []
  for (const pool of known) {
    const view = toView(pool, enrichment)
    if (view) views.push(view)
  }

  // The shared borrow token failing validation drops every pool at once — a
  // distinct signal from a legitimately empty indexer result (R28). Enrichment
  // always populates every registry token, so pxUSDT is present here.
  const sharedTokenFailed =
    known.length > 0 && !enrichment.tokens[SHARED_BORROW_TOKEN].decimals.valid

  return { views, sharedTokenFailed }
}

/** Assemble one pool, or `null` when a token's decimals can't be verified.
 *  Every collateral/borrow token here is registry-known and enrichment covers it,
 *  so the token and pool lookups are total. */
function toView(pool: RawPool, enrichment: PoolsEnrichment): MarketView | null {
  const collateral = enrichment.tokens[pool.collateralToken.toLowerCase()]
  const borrow = enrichment.tokens[pool.borrowToken.toLowerCase()]

  if (!collateral.decimals.valid) {
    logInvalidDecimals(pool.collateralToken, collateral.decimals)
    return null
  }
  if (!borrow.decimals.valid) {
    logInvalidDecimals(pool.borrowToken, borrow.decimals)
    return null
  }

  const size = enrichment.pools[pool.lendingPool.toLowerCase()].size

  return assembleMarketView(
    pool,
    size,
    collateral.price,
    collateral.decimals.decimals,
    borrow.decimals.decimals,
  )
}

/** The one pool query. Search/sort/pagination memoize over `data` (R17). */
export function usePools(): PoolsResult {
  const query = useQuery({ queryKey: ['pools'], queryFn: loadPools })
  return {
    data: query.data?.views ?? [],
    isLoading: query.isLoading,
    error: query.error,
    sharedTokenFailed: query.data?.sharedTokenFailed ?? false,
  }
}

/** Select one pool from the shared query result — no second fetch. */
export function usePool(address: Address): QueryResult<MarketView | undefined> {
  const { data, isLoading, error } = usePools()
  const target = address.toLowerCase()
  return {
    data: data.find((market) => market.id === target),
    isLoading,
    error,
  }
}

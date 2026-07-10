/**
 * The shared pool-list shell (U7). One component owns search, sort, pagination,
 * and all five terminal states for both the Earn and Borrow surfaces. Each
 * surface supplies only a column definition, a comparator, and a route prefix;
 * everything else — including the query — lives here.
 *
 * Search, sort, and pagination are `useMemo` derivations over the already-fetched
 * array (R17): the shell issues no `fetch`, holds no query key, and takes no
 * adapter reference. Filtering applies from the first typed character with no
 * debounce and no timer (R13). Pagination is client-side, 10 per page (R15).
 *
 * The five terminal states, in order:
 *   1. loading — `isLoading`
 *   2. error   — `error` truthy (R32) OR `sharedTokenFailed` (R28); one look
 *   3. empty   — resolved, zero pools, no shared-token failure
 *   4. no matches — pools exist but the query matches none (distinct from empty, R29)
 *   5. table   — the normal render
 */
import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { usePools } from '#/features/markets/hooks/usePools'
import type { MarketView } from '#/features/markets/types'
import { PoolSearch } from './PoolSearch'
import { Pagination } from './Pagination'

/** Horizontal alignment of a column's header and cells. */
export type ColumnAlign = 'left' | 'right'

/**
 * One column of the pool table. The first column in the array is the pool's
 * identity column: the shell wraps its cell body in a link to
 * `${routePrefix}/${market.id}`, so a caller returns just the cell content
 * (glyph, symbol, …) and the shell owns navigation.
 */
export interface PoolColumn {
  /** Header label. */
  header: string
  /** Renders the cell body from a pool view model. */
  cell: (market: MarketView) => ReactNode
  /** Text alignment (defaults to `left`). */
  align?: ColumnAlign
}

export interface PoolTableProps {
  /** The comparator the surface ranks by (e.g. `bySupply`, `byAvailableLiquidity`). */
  comparator: (a: MarketView, b: MarketView) => number
  /** The surface's columns; index 0 is the linked identity column. */
  columns: PoolColumn[]
  /** Link prefix for a row's destination — `/earn` or `/borrow`. */
  routePrefix: string
}

const PER_PAGE = 10

/** R12: case-insensitive substring over the five identity fields. */
function matchesQuery(market: MarketView, query: string): boolean {
  const fields = [
    market.id,
    market.poolAddress,
    market.collateralSymbol,
    market.borrowSymbol,
    market.collateralAddress,
    market.borrowAddress,
  ]
  return fields.some((field) => field.toLowerCase().includes(query))
}

function cellAlignClass(align: ColumnAlign | undefined): string {
  return align === 'right' ? 'num px-4 py-3 text-right' : 'px-4 py-3 text-left'
}

export function PoolTable({ comparator, columns, routePrefix }: PoolTableProps) {
  const { data, isLoading, error, sharedTokenFailed } = usePools()
  const [query, setQuery] = useState('')
  // The requested page; the rendered page is derived (clamped) from it so a
  // shrinking pool array never strands the user on a now-empty page (R16).
  const [requestedPage, setRequestedPage] = useState(1)
  const liveRegionId = useId()

  // Sort, then filter — both pure derivations over the fetched array (R17).
  const sorted = useMemo(
    () => [...data].sort(comparator),
    [data, comparator],
  )
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!normalizedQuery) return sorted
    return sorted.filter((market) => matchesQuery(market, normalizedQuery))
  }, [sorted, normalizedQuery])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  // Clamp: if the pool set shrank, `requestedPage` may exceed the new last page.
  const page = Math.min(Math.max(requestedPage, 1), pageCount)
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  )

  // Page resets to 1 whenever the query changes (R16).
  function handleQueryChange(next: string): void {
    setQuery(next)
    setRequestedPage(1)
  }

  // --- 1. loading -----------------------------------------------------------
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    )
  }

  // --- 2. error (indexer fault R32, or shared-token failure R28) ------------
  if (error || sharedTokenFailed) {
    return (
      <ErrorState
        title="Couldn't load pools"
        message="Something went wrong reading the pools. Try again shortly."
      />
    )
  }

  // --- 3. empty (resolved, genuinely no pools) ------------------------------
  if (data.length === 0) {
    return (
      <EmptyState
        title="No pools yet"
        description="Pools will appear here once they launch."
      />
    )
  }

  const count = filtered.length
  const announcement =
    pageCount > 1
      ? `${count} ${count === 1 ? 'pool' : 'pools'} found. Page ${page} of ${pageCount}.`
      : `${count} ${count === 1 ? 'pool' : 'pools'} found.`

  return (
    <div className="flex flex-col gap-4">
      <PoolSearch value={query} onChange={handleQueryChange} />

      {/* Polite live region: announces the filtered count and page changes. */}
      <div
        id={liveRegionId}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* --- 4. no matches (pools exist, query matches none) R29 ------------- */}
      {count === 0 ? (
        <EmptyState
          title="No matching pools"
          description={`No pools match "${query.trim()}".`}
          action={
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-[0.82rem] font-bold text-[var(--sea-ink)]"
            >
              Clear search
            </button>
          }
        />
      ) : (
        // --- 5. table ---------------------------------------------------------
        <>
          <div className="island-shell overflow-x-auto rounded-2xl">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[0.68rem] uppercase tracking-[0.07em] text-[var(--sea-ink-soft)]">
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className={`px-4 py-3 font-bold ${
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((market) => (
                  <tr
                    key={market.id}
                    className="border-b border-[var(--line)] last:border-0 hover:bg-[color-mix(in_oklab,var(--lagoon)_8%,transparent)]"
                  >
                    {columns.map((column, index) => (
                      <td key={index} className={cellAlignClass(column.align)}>
                        {index === 0 ? (
                          <a
                            href={`${routePrefix}/${market.id}`}
                            className="inline-flex items-center gap-2 font-semibold text-[var(--sea-ink)] no-underline"
                          >
                            {column.cell(market)}
                          </a>
                        ) : (
                          column.cell(market)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setRequestedPage}
          />
        </>
      )}
    </div>
  )
}

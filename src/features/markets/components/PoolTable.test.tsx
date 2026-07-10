import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Address } from '#/lib/contracts'
import { formatUsd } from '#/lib/format'
import { usePools } from '#/features/markets/hooks/usePools'
import type { PoolsResult } from '#/features/markets/hooks/usePools'
import type { MarketView } from '#/features/markets/types'
import { PoolTable } from './PoolTable'
import type { PoolColumn } from './PoolTable'

vi.mock('#/features/markets/hooks/usePools', () => ({ usePools: vi.fn() }))
const mockUsePools = vi.mocked(usePools)

// A stable no-op comparator: with a stable sort, insertion order is preserved,
// which keeps these fixtures deterministic regardless of their field values.
const keepOrder = (_a: MarketView, _b: MarketView) => 0

// Two columns; the first is the linked identity column.
const columns: PoolColumn[] = [
  { header: 'Pool', cell: (m) => <span>{m.collateralSymbol}</span> },
  {
    header: 'Borrow',
    align: 'right',
    cell: (m) => <span>{m.borrowSymbol}</span>,
  },
]

/** A purely-numeric hex address (no letters) so letter queries never match it. */
function numericAddress(seed: number): Address {
  return `0x${String(seed).padStart(40, '0')}`
}

let counter = 0
function makePool(over: Partial<MarketView> = {}): MarketView {
  counter += 1
  const address = over.poolAddress ?? numericAddress(counter)
  return {
    id: (over.id ?? address).toLowerCase(),
    poolAddress: address,
    collateralSymbol: `TOK${counter}`,
    collateralAddress: numericAddress(counter),
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    borrowAddress: numericAddress(900000),
    borrowDecimals: 6,
    supplyApy: 1,
    borrowApr: 1,
    utilization: 1,
    tvlUsd: 1000,
    availableLiquidityUsd: 500,
    priceUsd: 1,
    totalSupplyAssets: 1000n,
    totalBorrowAssets: 500n,
    priceStale: false,
    sizeKnown: true,
    lltv: 80,
    liqThreshold: 85,
    oracle: '0x0',
    crossChain: false,
    ...over,
  }
}

function mockResult(over: Partial<PoolsResult>): void {
  mockUsePools.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    sharedTokenFailed: false,
    ...over,
  })
}

function renderTable() {
  return render(
    <PoolTable comparator={keepOrder} columns={columns} routePrefix="/earn" />,
  )
}

function search(): HTMLElement {
  return screen.getByRole('searchbox')
}

beforeEach(() => {
  mockResult({ data: [makePool()] })
})

describe('PoolTable — terminal states', () => {
  // Scenario 1.
  it('renders the loading state while the query is pending', () => {
    mockResult({ isLoading: true })
    renderTable()
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  // Scenario 2.
  it('renders the error state for a rejected query, distinct from empty', () => {
    mockResult({ error: new Error('indexer down') })
    renderTable()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByText('No pools yet')).toBeNull()
  })

  // Scenario 3.
  it('renders the "No pools yet" empty state when resolved with zero pools', () => {
    mockResult({ data: [] })
    renderTable()
    expect(screen.getByText('No pools yet')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // Scenario 4.
  it('renders the error state for a shared-token failure, not the empty state', () => {
    mockResult({ data: [], sharedTokenFailed: true })
    renderTable()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByText('No pools yet')).toBeNull()
  })
})

describe('PoolTable — search & filtering', () => {
  // Scenario 5. Typing one character filters synchronously — no timer, no
  // fake timers. fireEvent.change dispatches without any async boundary, so a
  // passing assertion right after it proves there is no debounce.
  it('filters on a single keystroke with no timer', () => {
    mockResult({
      data: [
        makePool({ collateralSymbol: 'pxWBTC' }),
        makePool({ collateralSymbol: 'pxWETH' }),
      ],
    })
    renderTable()
    fireEvent.change(search(), { target: { value: 'b' } })
    expect(screen.getByText('pxWBTC')).toBeTruthy()
    expect(screen.queryByText('pxWETH')).toBeNull()
  })

  // Scenario 6.
  it('renders every pool for an empty query', () => {
    mockResult({
      data: [
        makePool({ collateralSymbol: 'GOLD' }),
        makePool({ collateralSymbol: 'ZINC' }),
        makePool({ collateralSymbol: 'IRON' }),
      ],
    })
    renderTable()
    expect(screen.getByText('GOLD')).toBeTruthy()
    expect(screen.getByText('ZINC')).toBeTruthy()
    expect(screen.getByText('IRON')).toBeTruthy()
  })

  // Scenario 7.
  it('matches pool address, both symbols, and token address, case-insensitively', () => {
    const pool1 = makePool({
      collateralSymbol: 'GOLD',
      collateralAddress: numericAddress(11111),
      poolAddress: numericAddress(11111),
      id: numericAddress(11111).toLowerCase(),
    })
    const pool2 = makePool({
      collateralSymbol: 'ZINC',
      borrowSymbol: 'pxWHSK',
      collateralAddress: numericAddress(22222),
      poolAddress: numericAddress(22222),
      id: numericAddress(22222).toLowerCase(),
    })
    mockResult({ data: [pool1, pool2] })
    renderTable()

    // Collateral symbol, case-insensitive.
    fireEvent.change(search(), { target: { value: 'GoLd' } })
    expect(screen.getByText('GOLD')).toBeTruthy()
    expect(screen.queryByText('ZINC')).toBeNull()

    // Borrow symbol.
    fireEvent.change(search(), { target: { value: 'whsk' } })
    expect(screen.getByText('ZINC')).toBeTruthy()
    expect(screen.queryByText('GOLD')).toBeNull()

    // Token / pool address substring.
    fireEvent.change(search(), { target: { value: '11111' } })
    expect(screen.getByText('GOLD')).toBeTruthy()
    expect(screen.queryByText('ZINC')).toBeNull()
  })

  // Scenario 8.
  it('shows a no-matches state naming the query, and clears it on action', () => {
    mockResult({
      data: [
        makePool({ collateralSymbol: 'GOLD' }),
        makePool({ collateralSymbol: 'ZINC' }),
      ],
    })
    renderTable()
    fireEvent.change(search(), { target: { value: 'zzz' } })

    // Distinct from the "no pools exist" empty state.
    expect(screen.queryByText('No pools yet')).toBeNull()
    expect(screen.getByRole('note')).toBeTruthy()
    // The query is named.
    expect(screen.getByText(/zzz/)).toBeTruthy()

    // Clearing restores the full list.
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(screen.getByText('GOLD')).toBeTruthy()
    expect(screen.getByText('ZINC')).toBeTruthy()
  })
})

describe('PoolTable — accessibility', () => {
  // Scenario 9.
  it('gives the search input an accessible name', () => {
    mockResult({ data: [makePool()] })
    renderTable()
    expect(screen.getByRole('searchbox', { name: /search/i })).toBeTruthy()
  })

  // Scenario 10.
  it('announces the filtered count through a polite live region', () => {
    mockResult({
      data: [
        makePool({ collateralSymbol: 'GOLD' }),
        makePool({ collateralSymbol: 'ZINC' }),
        makePool({ collateralSymbol: 'IRON' }),
      ],
    })
    renderTable()
    const live = screen.getByRole('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toContain('3')

    fireEvent.change(search(), { target: { value: 'gold' } })
    expect(live.textContent).toContain('1')
  })
})

describe('PoolTable — pagination', () => {
  // Scenario 11.
  it('shows ten rows and the pagination control with eleven pools', () => {
    mockResult({
      data: Array.from({ length: 11 }, () => makePool()),
    })
    renderTable()
    const body = screen.getAllByRole('rowgroup')[1] // thead, tbody
    expect(within(body).getAllByRole('row').length).toBe(10)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeTruthy()
  })

  // Scenario 12.
  it('renders no pagination control with four pools', () => {
    mockResult({ data: Array.from({ length: 4 }, () => makePool()) })
    renderTable()
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
  })

  // Scenario 13.
  it('exposes the current page and total, and marks the active control', () => {
    mockResult({ data: Array.from({ length: 11 }, () => makePool()) })
    const { container } = renderTable()
    expect(screen.getByText('Page 1 of 2')).toBeTruthy()
    const active = container.querySelector('[aria-current="page"]')
    expect(active?.textContent).toBe('Page 1 of 2')
  })

  // Scenario 14.
  it('narrowing a query from page 2 shows the matches, not a blank page', () => {
    const pools = Array.from({ length: 11 }, (_, i) =>
      makePool({ collateralSymbol: `ROW${i}` }),
    )
    // Give a pool on page 2 (index 10) a unique, letter-only symbol to find.
    pools[10] = makePool({ collateralSymbol: 'ZORRO' })
    mockResult({ data: pools })
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(screen.getByText('ZORRO')).toBeTruthy()

    // Typing a query that fits one page resets the page and shows the match.
    fireEvent.change(search(), { target: { value: 'zorro' } })
    expect(screen.getByText('ZORRO')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
  })

  // Scenario 15. rerender (not a fresh mount) so the page-2 state survives the
  // shrink and the clamp is what keeps the render non-empty.
  it('clamps the page when the pool array shrinks under the user', () => {
    const many = Array.from({ length: 11 }, (_, i) =>
      makePool({ collateralSymbol: `KEEP${i}` }),
    )
    mockResult({ data: many })
    const { rerender } = renderTable()

    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()

    // A background refetch removes pools while the user sits on page 2.
    mockResult({ data: many.slice(0, 4) })
    rerender(
      <PoolTable
        comparator={keepOrder}
        columns={columns}
        routePrefix="/earn"
      />,
    )
    // The clamp keeps the render on the only page, with rows, not a blank page.
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
    expect(screen.getByText('KEEP0')).toBeTruthy()
  })
})

// --- U9: degraded-state affordances on the row --------------------------------
// Columns that surface money cells, so an `undefined` value renders an em dash.
const usdColumns: PoolColumn[] = [
  { header: 'Pool', cell: (m) => <span>{m.collateralSymbol}</span> },
  { header: 'Price', align: 'right', cell: (m) => formatUsd(m.priceUsd) },
  { header: 'TVL', align: 'right', cell: (m) => formatUsd(m.tvlUsd) },
]

function renderUsdTable() {
  return render(
    <PoolTable
      comparator={keepOrder}
      columns={usdColumns}
      routePrefix="/earn"
    />,
  )
}

describe('PoolTable — degraded states (U9)', () => {
  // U9 scenario 1: a stale-price pool em-dashes its USD price cell and shows the
  // "Price stale" badge, while its size cells (price-independent) still render.
  it('em-dashes the price cell and shows the stale badge for a stale pool', () => {
    mockResult({
      data: [
        makePool({
          collateralSymbol: 'STALE',
          priceStale: true,
          priceUsd: undefined,
        }),
      ],
    })
    renderUsdTable()
    // Badge present.
    expect(screen.getByText('Price stale')).toBeTruthy()
    // Price cell is an em dash, not a $0.
    const body = screen.getAllByRole('rowgroup')[1]
    expect(within(body).getByText('—')).toBeTruthy()
    expect(within(body).queryByText('$0.00')).toBeNull()
    // The size cell still renders (price staleness does not blank the size).
    expect(within(body).getByText('$1,000.00')).toBeTruthy()
  })

  // U9 scenario 7: the badge carries role="status" so it is announced, not just
  // colored.
  it('marks the stale badge with role="status"', () => {
    mockResult({ data: [makePool({ priceStale: true, priceUsd: undefined })] })
    renderUsdTable()
    expect(screen.getByText('Price stale').getAttribute('role')).toBe('status')
  })

  // U9 scenario 5: an unknown-size pool em-dashes its size cells and carries an
  // audible "Size unavailable" marker — a genuinely zero-supply pool shows $0 and
  // no marker, so the two are distinguishable to a screen reader.
  it('distinguishes an unknown-size pool from a zero-size pool', () => {
    mockResult({
      data: [
        makePool({
          collateralSymbol: 'UNKNOWN',
          sizeKnown: false,
          tvlUsd: undefined,
          priceUsd: undefined,
        }),
        makePool({
          collateralSymbol: 'ZERO',
          sizeKnown: true,
          tvlUsd: 0,
          priceUsd: 0,
        }),
      ],
    })
    renderUsdTable()
    // The unknown-size pool is named, exactly once.
    expect(screen.getAllByText('Size unavailable')).toHaveLength(1)
    // The zero pool shows a real $0, not an em dash.
    const body = screen.getAllByRole('rowgroup')[1]
    expect(within(body).getAllByText('$0.00').length).toBeGreaterThan(0)
    // The unknown pool em-dashes its size cell.
    expect(within(body).getAllByText('—').length).toBeGreaterThan(0)
  })

  // U9 scenario 6 (row half): a fully healthy pool shows neither degraded marker.
  it('shows no degraded marker for a healthy pool', () => {
    mockResult({ data: [makePool({ collateralSymbol: 'FINE' })] })
    renderUsdTable()
    expect(screen.queryByText('Price stale')).toBeNull()
    expect(screen.queryByText('Size unavailable')).toBeNull()
  })
})

// Scenario 16: this suite mocks the pool hook, never `fetch`. The shell performs
// no I/O — search, sort, and pagination are pure derivations over the array.
describe('PoolTable — no I/O', () => {
  it('does not touch global fetch', () => {
    const original = globalThis.fetch
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy
    try {
      mockResult({ data: [makePool()] })
      renderTable()
      fireEvent.change(search(), { target: { value: 'tok' } })
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = original
    }
  })
})

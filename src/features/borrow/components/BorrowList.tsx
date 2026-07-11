import { formatPercent } from '#/lib/format'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { PoolTable } from '#/features/markets/components/PoolTable'
import type { PoolColumn } from '#/features/markets/components/PoolTable'
import { compactUsd, numColumn } from '#/features/markets/columns'
import { byAvailableLiquidity } from '#/features/markets/sort'

// Borrow columns (R7). Index 0 is the identity column: the shell wraps its body
// in the row link, so it returns just the glyph + symbol — handed the collateral
// **address** so the real logo resolves (symbol alone can't tell the two pxWHSK
// contracts apart, R26). Numeric cells em-dash an `undefined` via the formatters.
const BORROW_COLUMNS: PoolColumn[] = [
  {
    header: 'Pool',
    // The pair: collateral over the token borrowers draw (the borrow token).
    cell: (m) => (
      <>
        <TokenPairGlyph
          collateralSymbol={m.collateralSymbol}
          borrowSymbol={m.borrowSymbol}
          collateralAddress={m.collateralAddress}
          borrowAddress={m.borrowAddress}
          size={20}
        />
        <span>
          {m.collateralSymbol}
          <span className="text-[var(--sea-ink-soft)]">
            {' / '}
            {m.borrowSymbol}
          </span>
        </span>
      </>
    ),
  },
  numColumn('Total supply', (m) => compactUsd(m.tvlUsd)),
  numColumn('Borrow APR', (m) => (
    <span className="font-semibold" style={{ color: 'var(--danger)' }}>
      {formatPercent(m.borrowApr)}
    </span>
  )),
  numColumn('LTV', (m) => formatPercent(m.lltv)),
  numColumn('Liq. threshold', (m) => formatPercent(m.liqThreshold)),
  numColumn('Liquidity', (m) => compactUsd(m.availableLiquidityUsd)),
]

// The Borrow plane list (U4, R7): pools ranked by free liquidity first — a big
// pool with nothing left to lend is useless to a borrower — over the shared shell
// that owns search, sort, pagination, and states.
export function BorrowList() {
  return (
    <PoolTable
      comparator={byAvailableLiquidity}
      columns={BORROW_COLUMNS}
      routePrefix="/borrow"
    />
  )
}

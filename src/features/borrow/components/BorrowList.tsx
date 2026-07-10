import type { ReactNode } from 'react'
import { formatPercent, formatUsd } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { PoolTable } from '#/features/markets/components/PoolTable'
import type { PoolColumn } from '#/features/markets/components/PoolTable'
import type { MarketView } from '#/features/markets/types'
import { byAvailableLiquidity } from '#/features/markets/sort'

/** A right-aligned numeric column. */
const num = (
  header: string,
  cell: (m: MarketView) => ReactNode,
): PoolColumn => ({
  header,
  align: 'right',
  cell,
})
const usd = (v: number | undefined) => formatUsd(v, { compact: true })

// Borrow columns (R7). Index 0 is the identity column: the shell wraps its body
// in the row link, so it returns just the glyph + symbol — handed the collateral
// **address** so the real logo resolves (symbol alone can't tell the two pxWHSK
// contracts apart, R26). Numeric cells em-dash an `undefined` via the formatters.
const BORROW_COLUMNS: PoolColumn[] = [
  {
    header: 'Pool',
    cell: (m) => (
      <>
        <TokenGlyph
          symbol={m.collateralSymbol}
          address={m.collateralAddress}
          size={20}
        />
        {m.collateralSymbol}
      </>
    ),
  },
  num('Total supply', (m) => usd(m.tvlUsd)),
  num('Borrow APR', (m) => (
    <span className="font-semibold" style={{ color: 'var(--danger)' }}>
      {formatPercent(m.borrowApr)}
    </span>
  )),
  num('LTV', (m) => formatPercent(m.lltv)),
  num('Liq. threshold', (m) => formatPercent(m.liqThreshold)),
  num('Liquidity', (m) => usd(m.availableLiquidityUsd)),
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

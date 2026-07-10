import type { ReactNode } from 'react'
import { formatPercent, formatUsd } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { PoolTable } from '#/features/markets/components/PoolTable'
import type { PoolColumn } from '#/features/markets/components/PoolTable'
import type { MarketView } from '#/features/markets/types'
import { bySupply } from '#/features/markets/sort'

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

// Earn columns (R5). Index 0 is the identity column: the shell wraps its body in
// the row link, so it returns just the glyph + symbol — handed the collateral
// **address** so the real logo resolves (symbol alone can't tell the two pxWHSK
// contracts apart, R26). Numeric cells em-dash an `undefined` via the formatters.
const EARN_COLUMNS: PoolColumn[] = [
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
  num('Supply APY', (m) => (
    <span className="font-semibold" style={{ color: 'var(--palm)' }}>
      {formatPercent(m.supplyApy)}
    </span>
  )),
  num('Interest rate', (m) => formatPercent(m.borrowApr)),
  num('Utilization', (m) => formatPercent(m.utilization)),
  num('Liquidity', (m) => usd(m.availableLiquidityUsd)),
]

// The Earn plane list (U3, R5): pools ranked largest-first — what a lender looks
// for — over the shared shell that owns search, sort, pagination, and states.
export function EarnList() {
  return (
    <PoolTable
      comparator={bySupply}
      columns={EARN_COLUMNS}
      routePrefix="/earn"
    />
  )
}

import { formatPercent } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { PoolTable } from '#/features/markets/components/PoolTable'
import type { PoolColumn } from '#/features/markets/components/PoolTable'
import { compactUsd, numColumn } from '#/features/markets/columns'
import { bySupply } from '#/features/markets/sort'

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
  numColumn('Total supply', (m) => compactUsd(m.tvlUsd)),
  numColumn('Supply APY', (m) => (
    <span className="font-semibold" style={{ color: 'var(--palm)' }}>
      {formatPercent(m.supplyApy)}
    </span>
  )),
  numColumn('Interest rate', (m) => formatPercent(m.borrowApr)),
  numColumn('Utilization', (m) => formatPercent(m.utilization)),
  numColumn('Liquidity', (m) => compactUsd(m.availableLiquidityUsd)),
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

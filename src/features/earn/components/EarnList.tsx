import { formatPercent } from '#/lib/format'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
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
    // The pair: collateral over the token lenders supply (the borrow token).
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

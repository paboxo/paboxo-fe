import { formatUsd } from '#/lib/format'
import { requiredDropPct } from '#/lib/risk/health'

/**
 * The primary risk statement (U4, R11): the price at which the position
 * liquidates and the move required to get there — more actionable than HF alone.
 */
export function LiquidationPrice({
  asset,
  currentPrice,
  liquidationPrice,
}: {
  asset: string
  currentPrice: number
  liquidationPrice: number
}) {
  const drop = requiredDropPct(currentPrice, liquidationPrice)
  const sign = drop > 0 ? '+' : ''
  return (
    <p className="m-0 text-[0.82rem] text-[var(--sea-ink)]">
      Liquidates if <b>{asset}</b> falls below{' '}
      <span className="num">{formatUsd(liquidationPrice)}</span>{' '}
      <span className="num font-bold" style={{ color: 'var(--danger)' }}>
        ({sign}
        {drop.toFixed(0)}%)
      </span>
    </p>
  )
}

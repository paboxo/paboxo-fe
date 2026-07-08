import { formatPercent } from '#/lib/format'

/** APY provenance split (U13, R31): base yield vs. incentive rewards, by color. */
export function APYBreakdown({
  base,
  rewards,
}: {
  base: number
  rewards?: number
}) {
  const total = base + (rewards ?? 0)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span
          className="display-title text-2xl font-semibold"
          style={{ color: 'var(--palm)' }}
        >
          {formatPercent(total)}
        </span>
        <span className="text-sm text-[var(--sea-ink-soft)]">
          net supply APY
        </span>
      </div>
      <div className="flex gap-3 text-[0.78rem]">
        <span className="num text-[var(--sea-ink)]">
          {formatPercent(base)} base
        </span>
        {rewards ? (
          <span className="num" style={{ color: 'var(--palm)' }}>
            +{formatPercent(rewards)} rewards
          </span>
        ) : null}
      </div>
    </div>
  )
}

import { formatPercent } from '#/lib/format'

/** Net supply APY headline. (Rewards were deleted in U5 — no source exists.) */
export function APYBreakdown({ base }: { base: number | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span
          className="display-title text-2xl font-semibold"
          style={{ color: 'var(--palm)' }}
        >
          {formatPercent(base)}
        </span>
        <span className="text-sm text-[var(--sea-ink-soft)]">
          net supply APY
        </span>
      </div>
    </div>
  )
}

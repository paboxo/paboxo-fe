import { TONE_COLOR } from './metrics'
import type { Tone } from './metrics'

export interface StatTileProps {
  label: string
  /** Pre-formatted display string. */
  value: string
  tone?: Tone
  hint?: string
  /** Hero tiles use the Fraunces display face for the value. */
  hero?: boolean
}

/** A labelled stat block for dashboards and the portfolio strip (U3, R4, R9). */
export function StatTile({
  label,
  value,
  tone = 'neutral',
  hint,
  hero = false,
}: StatTileProps) {
  return (
    <div className="flex flex-col gap-0.5" data-tone={tone}>
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
        {label}
      </span>
      <span
        className={
          hero
            ? 'display-title text-2xl font-semibold'
            : 'num text-[0.95rem] font-semibold'
        }
        style={{ color: TONE_COLOR[tone] }}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

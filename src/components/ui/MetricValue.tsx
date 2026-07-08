import { formatSignedPercent } from '#/lib/format'
import { METRICS, TONE_COLOR } from './metrics'
import type { MetricKey, Tone } from './metrics'

/**
 * A signed delta badge (U3, R2). Direction is carried by an arrow and a sign,
 * never by color alone — the color is redundant reinforcement.
 */
export function DeltaBadge({ delta }: { delta: number }) {
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const color =
    direction === 'up'
      ? 'var(--palm)'
      : direction === 'down'
        ? 'var(--danger)'
        : 'var(--sea-ink-soft)'
  return (
    <span
      className="num text-[0.76rem] font-bold"
      data-direction={direction}
      style={{ color }}
    >
      {arrow} {formatSignedPercent(delta)}
    </span>
  )
}

export interface MetricValueProps {
  /** Registry key — supplies label + tone unless overridden. */
  metric?: MetricKey
  label?: string
  /** Pre-formatted display string (callers use the format lib). */
  value: string
  tone?: Tone
  delta?: number
  align?: 'start' | 'end'
}

export function MetricValue({
  metric,
  label,
  value,
  tone,
  delta,
  align = 'start',
}: MetricValueProps) {
  const spec = metric ? METRICS[metric] : undefined
  const resolvedLabel = label ?? spec?.label
  const resolvedTone: Tone = tone ?? spec?.tone ?? 'neutral'
  return (
    <span
      className="inline-flex flex-col gap-0.5"
      data-tone={resolvedTone}
      style={{ alignItems: align === 'end' ? 'flex-end' : 'flex-start' }}
    >
      {resolvedLabel ? (
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
          {resolvedLabel}
        </span>
      ) : null}
      <span
        className="num text-[0.95rem] font-semibold"
        style={{ color: TONE_COLOR[resolvedTone] }}
      >
        {value}
      </span>
      {delta !== undefined ? <DeltaBadge delta={delta} /> : null}
    </span>
  )
}

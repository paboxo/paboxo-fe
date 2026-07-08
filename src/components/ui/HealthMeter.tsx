import { RISK_COLOR, healthBuffer, healthZone } from '#/lib/risk/health'
import { RiskZone } from './RiskZone'

function formatHf(hf: number): string {
  return Number.isFinite(hf) ? `HF ${hf.toFixed(2)}` : 'HF ∞'
}

/**
 * The buffer-to-liquidation meter (U4, R10). The fill EMPTIES toward danger and
 * takes the zone's tone; the raw HF number is present but subordinate.
 */
export function HealthMeter({
  hf,
  showNumber = true,
}: {
  hf: number
  showNumber?: boolean
}) {
  const zone = healthZone(hf)
  const buffer = healthBuffer(hf)
  return (
    <div
      className="flex flex-col gap-1.5"
      role="group"
      aria-label={`Health ${zone.label}, ${formatHf(hf)}`}
    >
      <div className="flex items-center justify-between">
        <RiskZone zone={zone} />
        {showNumber ? (
          <span className="num text-[0.8rem] text-[var(--sea-ink-soft)]">
            {formatHf(hf)}
          </span>
        ) : null}
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full"
        style={{
          background: 'color-mix(in oklab, var(--sea-ink) 12%, transparent)',
        }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300"
          style={{
            width: `${buffer * 100}%`,
            background: RISK_COLOR[zone.tone],
          }}
        />
      </div>
    </div>
  )
}

import { healthBuffer } from '#/lib/risk/health'
import { hfZone } from '#/lib/risk/hfZone'

function formatHf(hf: number): string {
  return Number.isFinite(hf) ? `HF ${hf.toFixed(2)}` : 'HF ∞'
}

/**
 * The buffer-to-liquidation meter (U4, R10). The fill EMPTIES toward danger and
 * takes the agent zone's color; the raw HF number is present but subordinate.
 * Zone color/label route through `hfZone` so the meter matches every other HF
 * surface and the agent's action thresholds.
 */
export function HealthMeter({
  hf,
  showNumber = true,
}: {
  hf: number
  showNumber?: boolean
}) {
  const zone = hfZone(hf)
  const buffer = healthBuffer(hf)
  return (
    <div
      className="flex flex-col gap-1.5"
      role="group"
      aria-label={`Health ${zone.label}, ${formatHf(hf)}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-bold"
          data-zone={zone.key}
          style={{ color: zone.color, background: zone.soft }}
        >
          <span aria-hidden="true">{zone.shape}</span> {zone.label}
        </span>
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
            background: zone.color,
          }}
        />
      </div>
    </div>
  )
}

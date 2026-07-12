import { hfZone } from '#/lib/risk/hfZone'
import { HfZoneMark } from '#/components/icons/HfZoneMark'

function formatHf(hf: number): string {
  return Number.isFinite(hf) ? hf.toFixed(2) : '∞'
}

/**
 * The canonical Health-Factor pill: value + agent zone color + label, with the
 * zone glyph so risk never rides on hue alone (R3, R4). Pass `showNote` to
 * surface the agent's action range under the `watch` zone.
 */
export function HealthFactorBadge({
  hf,
  showNote = false,
}: {
  hf: number
  showNote?: boolean
}) {
  const zone = hfZone(hf)
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.78rem] font-bold"
        data-zone={zone.key}
        style={{ color: zone.color, background: zone.soft }}
        aria-label={`Health factor ${formatHf(hf)}, ${zone.label}`}
      >
        <HfZoneMark zone={zone.key} />
        <span className="num">HF {formatHf(hf)}</span>
        <span className="text-[0.7rem] font-semibold opacity-80">
          {zone.label}
        </span>
      </span>
      {showNote && zone.note ? (
        <span className="text-[0.68rem] text-[var(--sea-ink-soft)]">
          {zone.note}
        </span>
      ) : null}
    </span>
  )
}

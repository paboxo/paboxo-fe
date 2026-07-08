import { RISK_COLOR, healthZone } from '#/lib/risk/health'
import { RiskZone } from './RiskZone'

function formatHf(hf: number): string {
  return Number.isFinite(hf) ? hf.toFixed(2) : '∞'
}

/**
 * Projected before→after health for a risk-changing action (U4, R12, R13).
 * Recolors live toward the projected zone; when the projection is worse and
 * leaves Safe, it surfaces an inline remedy rather than a bare warning.
 */
export function ProjectedHealth({
  currentHf,
  projectedHf,
}: {
  currentHf: number
  projectedHf: number
}) {
  const from = healthZone(currentHf)
  const to = healthZone(projectedHf)
  const worse = projectedHf < currentHf
  const leavesSafe = to.tone !== 'safe'
  return (
    <div
      className="flex flex-col gap-1 rounded-xl p-2.5"
      data-projected-zone={to.key}
      role="status"
      aria-live="polite"
      style={{
        background: leavesSafe ? 'var(--caution-soft)' : 'var(--safe-soft)',
      }}
    >
      <div className="flex items-center gap-2 text-[0.82rem]">
        <span className="text-[var(--sea-ink-soft)]">Health</span>
        <span
          className="num font-semibold"
          style={{ color: RISK_COLOR[from.tone] }}
        >
          {formatHf(currentHf)}
        </span>
        <span aria-hidden="true">→</span>
        <span
          className="num font-semibold"
          style={{ color: RISK_COLOR[to.tone] }}
        >
          {formatHf(projectedHf)}
        </span>
        <span className="ml-auto">
          <RiskZone zone={to} />
        </span>
      </div>
      {worse && leavesSafe ? (
        <p className="m-0 text-[0.75rem] text-[var(--sea-ink-soft)]">
          Add collateral or repay to move back toward Safe.
        </p>
      ) : null}
    </div>
  )
}

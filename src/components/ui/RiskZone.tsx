import { RISK_COLOR, RISK_SOFT, healthZone } from '#/lib/risk/health'
import type { HealthZone } from '#/lib/risk/health'

/** A risk-zone chip: shape + label + tone, so the state reads without color (U4, R2, R10). */
export function RiskZone({ hf, zone }: { hf?: number; zone?: HealthZone }) {
  const resolved = zone ?? (hf !== undefined ? healthZone(hf) : undefined)
  if (!resolved) return null
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-bold"
      data-zone={resolved.key}
      style={{
        color: RISK_COLOR[resolved.tone],
        background: RISK_SOFT[resolved.tone],
      }}
    >
      <span aria-hidden="true">{resolved.shape}</span> {resolved.label}
    </span>
  )
}

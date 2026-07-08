/**
 * Health-factor risk model (U4, R10–R13). One pure source of truth for the
 * HF→zone mapping and the liquidation buffer, reused by the meter, the zone
 * chips, and the projected before→after preview so nothing re-derives it.
 *
 * Buffer semantics: the value EMPTIES toward danger — a full bar means safe, an
 * empty bar means at the liquidation line. A "100% = good" bar is never used.
 */

export type HealthZoneKey =
  | 'noDebt'
  | 'safe'
  | 'comfortable'
  | 'watch'
  | 'atRisk'
  | 'critical'
  | 'liquidatable'

export type RiskTone = 'safe' | 'caution' | 'danger'

export interface HealthZone {
  key: HealthZoneKey
  label: string
  tone: RiskTone
  /** A non-color signal paired with the label so risk never rides on hue alone. */
  shape: string
}

const ZONES: Record<HealthZoneKey, HealthZone> = {
  noDebt: { key: 'noDebt', label: 'No debt', tone: 'safe', shape: '∞' },
  safe: { key: 'safe', label: 'Safe', tone: 'safe', shape: '●' },
  comfortable: {
    key: 'comfortable',
    label: 'Comfortable',
    tone: 'safe',
    shape: '●',
  },
  watch: { key: 'watch', label: 'Watch', tone: 'caution', shape: '◐' },
  atRisk: { key: 'atRisk', label: 'At risk', tone: 'danger', shape: '△' },
  critical: { key: 'critical', label: 'Critical', tone: 'danger', shape: '△' },
  liquidatable: {
    key: 'liquidatable',
    label: 'Liquidatable',
    tone: 'danger',
    shape: '⛔',
  },
}

/** A position with no debt cannot be liquidated. */
export const NO_DEBT = Number.POSITIVE_INFINITY

export function healthZone(hf: number): HealthZone {
  if (!Number.isFinite(hf)) return ZONES.noDebt
  if (hf >= 2) return ZONES.safe
  if (hf >= 1.5) return ZONES.comfortable
  if (hf >= 1.25) return ZONES.watch
  if (hf >= 1.1) return ZONES.atRisk
  if (hf > 1) return ZONES.critical
  return ZONES.liquidatable
}

/** Fraction of buffer remaining (1 = safe, 0 = at the liquidation line). */
export function healthBuffer(hf: number): number {
  if (!Number.isFinite(hf)) return 1
  return Math.max(0, Math.min(1, (hf - 1) / (2 - 1)))
}

/** Signed % move in the collateral price that reaches liquidation (negative = a drop). */
export function requiredDropPct(
  currentPrice: number,
  liquidationPrice: number,
): number {
  if (currentPrice <= 0) return 0
  return ((liquidationPrice - currentPrice) / currentPrice) * 100
}

export const RISK_COLOR: Record<RiskTone, string> = {
  safe: 'var(--safe)',
  caution: 'var(--caution)',
  danger: 'var(--danger)',
}

export const RISK_SOFT: Record<RiskTone, string> = {
  safe: 'var(--safe-soft)',
  caution: 'var(--caution-soft)',
  danger: 'var(--danger-soft)',
}

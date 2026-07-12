/**
 * Rebalance-agent Health-Factor zones (R3, R4). One source of truth mapping an
 * HF to the agent's four-color zone, keyed to the keeper thresholds: the agent
 * acts inside the `watch` band (hfBuffer 1.15 → hfTarget 1.30).
 *
 * Distinct from `healthZone` in `health.ts`, which drives the finer-grained
 * buffer meter. This is the coarse, agent-facing zone shown on every portfolio
 * HF surface so the color always matches "when will the agent act".
 */

export type HfZoneKey = 'healthy' | 'watch' | 'danger' | 'liquidatable'

export interface HfZone {
  key: HfZoneKey
  label: string
  /** Zone color as a theme CSS var: green / yellow / orange / red. */
  color: string
  /** Soft background companion to `color`. */
  soft: string
  /** Extra context; only the `watch` zone explains that the agent acts here. */
  note?: string
}

/** The agent acts when HF drops below the buffer, targeting recovery to target. */
export const HF_BUFFER = 1.15
export const HF_TARGET = 1.3

const ZONES: Record<HfZoneKey, HfZone> = {
  healthy: {
    key: 'healthy',
    label: 'Healthy',
    color: 'var(--safe)',
    soft: 'var(--safe-soft)',
  },
  watch: {
    key: 'watch',
    label: 'Watch',
    color: 'var(--caution)',
    soft: 'var(--caution-soft)',
    note: 'Agent acts here (1.15 → 1.30)',
  },
  danger: {
    key: 'danger',
    label: 'Danger',
    color: 'var(--warning)',
    soft: 'var(--warning-soft)',
  },
  liquidatable: {
    key: 'liquidatable',
    label: 'Liquidatable',
    color: 'var(--danger)',
    soft: 'var(--danger-soft)',
  },
}

/**
 * Map an HF to its agent zone. Boundaries land in the higher-safety zone:
 * 1.30 → healthy, 1.15 → watch, 1.00 → danger. A position with no debt
 * (HF = ∞) cannot be liquidated, so it reads as healthy.
 */
export function hfZone(hf: number): HfZone {
  if (!Number.isFinite(hf)) return ZONES.healthy
  if (hf >= HF_TARGET) return ZONES.healthy
  if (hf >= HF_BUFFER) return ZONES.watch
  if (hf >= 1) return ZONES.danger
  return ZONES.liquidatable
}

import { formatPercent } from '#/lib/format'

export interface APYValueProps {
  /** APY in percent units (e.g. 5.24 for 5.24%). */
  apy: number
  /** Optional reward APY split out so provenance (real yield vs incentives) is visible. */
  rewards?: number
  size?: 'sm' | 'lg'
}

/**
 * APY as the visual hero (U3, R4, R31). Palm-green, mono at row scale and
 * Fraunces at hero scale; rewards are a separate tinted chip so users can see
 * how much of the yield is incentives.
 */
export function APYValue({ apy, rewards, size = 'sm' }: APYValueProps) {
  const large = size === 'lg'
  return (
    <span
      className="inline-flex items-baseline gap-1.5"
      data-testid="apy-value"
    >
      <span
        className={
          large
            ? 'display-title font-semibold'
            : 'num text-[1rem] font-semibold'
        }
        style={{ color: 'var(--palm)', fontSize: large ? '1.7rem' : undefined }}
      >
        {formatPercent(apy)}
      </span>
      {rewards ? (
        <span
          className="num rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold"
          style={{ color: 'var(--palm)', background: 'var(--safe-soft)' }}
        >
          +{formatPercent(rewards)} rewards
        </span>
      ) : null}
    </span>
  )
}

/**
 * Small degraded-state markers for pool rows and the detail header (U9, R9/R27).
 *
 * `StaleBadge` mirrors `DegradedNotice`'s caution tone and carries `role="status"`
 * so a stale price feed is announced, not merely colored. `SizeUnavailableChip`
 * distinguishes a pool whose balance reads failed (em-dash cells) from a genuinely
 * zero-supply pool ($0): the em dash alone is silent to a screen reader, so the
 * chip gives the unknown-size row a name a screen-reader user can hear.
 *
 * Neither is keyed on any pool state, so a pool recovering on a refetch swaps the
 * badge in or out without remounting the row (R9/AE3).
 */

/**
 * The disabled-write reason for a stale-priced pool (R10). Panels feed this
 * through `ActionPanel`'s amount-independent block so the button carries a linked,
 * keyboard-reachable reason — never a hover-only tooltip a `disabled` button would
 * swallow. Kept as one constant so the badge, the panels, and their tests agree.
 */
export const STALE_PRICE_REASON =
  'Price feed is stale — this action is paused until it updates.'

/** A `role="status"` caution badge for a pool whose collateral price is stale. */
export function StaleBadge({ label = 'Price stale' }: { label?: string }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
      style={{ background: 'var(--caution-soft)', color: 'var(--sea-ink)' }}
    >
      <span aria-hidden="true">◐</span>
      {label}
    </span>
  )
}

/**
 * A chip marking a pool whose size reads failed. Its visible text is inherently
 * announced, so a screen-reader user tells it apart from a `$0` pool — where the
 * em dash the failed cells render would otherwise be silent.
 */
export function SizeUnavailableChip({
  label = 'Size unavailable',
}: {
  label?: string
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
      style={{
        background: 'var(--chip-bg)',
        color: 'var(--sea-ink-soft)',
        border: '1px solid var(--line)',
      }}
    >
      {label}
    </span>
  )
}

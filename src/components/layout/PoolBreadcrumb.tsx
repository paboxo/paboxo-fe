import { Link } from '@tanstack/react-router'

/**
 * Detail-page breadcrumb: a back link that names its destination, then the
 * current pool as inert text.
 *
 * The link says `‹ Earn`, not `‹ Back` — browser-back can land anywhere (a user
 * may have arrived from Portfolio), so naming the destination is the honest
 * affordance. The chevron is decorative; the accessible name comes from the
 * text. The current pool carries `aria-current="page"` per the WAI-ARIA
 * breadcrumb pattern, so a screen-reader user hears where they are.
 */
export function PoolBreadcrumb({
  to,
  label,
  current,
}: {
  to: '/earn' | '/borrow'
  label: string
  /** The current pool, e.g. `pxWHSK · pxUSDT`. Omitted while the pool loads. */
  current?: string
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--sea-ink-soft)]">
      {/* `activeOptions.exact` matters here: `/earn` is a prefix of `/earn/$id`,
          so a non-exact Link would set `aria-current="page"` on itself and two
          elements would claim to be the current page — the back link loudest. */}
      <Link
        to={to}
        activeOptions={{ exact: true }}
        className="inline-flex items-center gap-1 font-semibold text-[var(--sea-ink)] no-underline"
      >
        <span aria-hidden="true">‹</span>
        {label}
      </Link>
      {current ? (
        <>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{current}</span>
        </>
      ) : null}
    </nav>
  )
}

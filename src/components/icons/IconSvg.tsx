import type { ReactNode } from 'react'

/**
 * The shared `<svg>` shell for this module's hand-drawn icons.
 *
 * Every icon is decorative: the nav item's accessible name comes from its text,
 * so the icon must contribute none. Centralising `aria-hidden` and
 * `focusable="false"` here means a future icon cannot forget them.
 *
 * `currentColor` lets each icon inherit its link's colour, including the
 * `.nav-link.is-active` state.
 */
export function IconSvg({
  size = 16,
  children,
}: {
  size?: number
  children: ReactNode
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

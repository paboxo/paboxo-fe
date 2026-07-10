import type { IconProps } from './types'

/**
 * Portfolio — a pie split into segments. One highlighted quarter wedge plus the
 * remaining three-quarters reads as an allocation breakdown at 16px.
 */
export function PortfolioIcon({ size = 16 }: IconProps) {
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
      <path d="M12 12V3a9 9 0 0 1 9 9h-9Z" />
      <path d="M12 12h9a9 9 0 1 1-9-9" />
    </svg>
  )
}

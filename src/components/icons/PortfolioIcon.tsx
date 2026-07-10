import type { IconProps } from './types'
import { IconSvg } from './IconSvg'

/**
 * Portfolio — a pie split into segments. One highlighted quarter wedge plus the
 * remaining three-quarters reads as an allocation breakdown at 16px.
 */
export function PortfolioIcon({ size }: IconProps) {
  return (
    <IconSvg size={size}>
      <path d="M12 12V3a9 9 0 0 1 9 9h-9Z" />
      <path d="M12 12h9a9 9 0 1 1-9-9" />
    </IconSvg>
  )
}

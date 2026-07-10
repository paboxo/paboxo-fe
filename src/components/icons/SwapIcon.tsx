import type { IconProps } from './types'
import { IconSvg } from './IconSvg'

/**
 * Swap — two arrows running opposite ways. Top arrow points right, bottom
 * points left, the classic "exchange A for B" silhouette.
 */
export function SwapIcon({ size }: IconProps) {
  return (
    <IconSvg size={size}>
    <path d="M4 9h13" />
    <path d="M14 6l3 3-3 3" />
    <path d="M20 15H7" />
    <path d="M10 12l-3 3 3 3" />
    </IconSvg>
  )
}

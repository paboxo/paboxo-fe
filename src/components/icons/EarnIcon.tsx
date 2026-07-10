import type { IconProps } from './types'
import { IconSvg } from './IconSvg'

/**
 * Earn — a stack of coins. Deposits grow a balance, so the silhouette is a
 * short tower of stacked disks that reads clearly at 16px.
 */
export function EarnIcon({ size }: IconProps) {
  return (
    <IconSvg size={size}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
    </IconSvg>
  )
}

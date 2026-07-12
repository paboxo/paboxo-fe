import type { IconProps } from './types'
import { IconSvg } from './IconSvg'

/** Shield with a check — agent protection. Inherits `currentColor`. */
export function ShieldIcon({ size }: IconProps) {
  return (
    <IconSvg size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </IconSvg>
  )
}

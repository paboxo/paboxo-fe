import type { IconProps } from './types'
import { IconSvg } from './IconSvg'

/** A downward chevron. Rotate 180° via CSS to point up. Inherits currentColor. */
export function ChevronIcon({ size }: IconProps) {
  return (
    <IconSvg size={size}>
      <path d="m6 9 6 6 6-6" />
    </IconSvg>
  )
}

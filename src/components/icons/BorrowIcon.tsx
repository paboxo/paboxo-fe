import type { IconProps } from './types'
import { IconSvg } from './IconSvg'

/**
 * Borrow — value leaving a vault. An open-sided box with an arrow travelling
 * out of it to the right reads as "take a loan out" at 16px.
 */
export function BorrowIcon({ size }: IconProps) {
  return (
    <IconSvg size={size}>
      <path d="M13 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
      <path d="M11 12h9" />
      <path d="M16 8l4 4-4 4" />
    </IconSvg>
  )
}

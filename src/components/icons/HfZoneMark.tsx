import type { HfZoneKey } from '#/lib/risk/hfZone'
import { IconSvg } from './IconSvg'

/**
 * A distinct SVG mark per Health-Factor zone. The SHAPE differs by zone (not
 * just color), so the risk reads without relying on hue alone (a11y). Inherits
 * `currentColor` from the badge, which already carries the zone color.
 */
export function HfZoneMark({
  zone,
  size = 14,
}: {
  zone: HfZoneKey
  size?: number
}) {
  return <IconSvg size={size}>{MARKS[zone]}</IconSvg>
}

const MARKS: Record<HfZoneKey, React.ReactNode> = {
  // Check in a circle — safe.
  healthy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  // An eye — the zone the agent watches.
  watch: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  // Alert triangle — danger.
  danger: (
    <>
      <path d="M10.3 4 2.5 18a1.5 1.5 0 0 0 1.3 2.2h16.4A1.5 1.5 0 0 0 21.5 18L13.7 4a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  // Octagon with an X — liquidatable (stop).
  liquidatable: (
    <>
      <path d="M7.9 3h8.2L21 7.9v8.2L16.1 21H7.9L3 16.1V7.9L7.9 3Z" />
      <path d="m9.5 9.5 5 5" />
      <path d="m14.5 9.5-5 5" />
    </>
  ),
}

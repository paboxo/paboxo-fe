import { useState } from 'react'
import type { Address } from '#/lib/contracts'
import { getTokenByAddress } from '#/lib/tokens/registry'

/** A simple circular token glyph so rows read against the glass. Renders the
 *  token's real logo when an `address` the registry knows is passed, and falls
 *  back to an initials circle otherwise. */
export function TokenGlyph({
  symbol,
  address,
  size = 26,
}: {
  symbol: string
  /** When set and known to the registry, the real logo renders instead of initials. */
  address?: Address
  size?: number
}) {
  const entry = address ? getTokenByAddress(address) : undefined
  // A registry path can still 404 at runtime (renamed / not-yet-deployed asset);
  // fall back to the initials circle instead of a broken-image icon.
  const [failed, setFailed] = useState(false)

  // The 1.5px cutout border is what separates the front token from the one
  // tucked 40% behind it in TokenPairGlyph — the logo must keep it too.
  if (entry && !failed) {
    return (
      <img
        src={entry.logo}
        alt=""
        aria-hidden="true"
        onError={() => setFailed(true)}
        className="inline-block flex-shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: '9999px',
          border: '1.5px solid var(--surface-strong)',
          objectFit: 'cover',
        }}
      />
    )
  }

  const label = symbol.replace(/^px/i, '').slice(0, 3).toUpperCase()
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full font-bold text-[#0a1418]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: 'linear-gradient(140deg,#6cc6f0,#0690d4)',
        border: '1.5px solid var(--surface-strong)',
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

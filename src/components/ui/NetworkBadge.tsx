/** The HashKey network mark. Reuses the pxWHSK (WHSK) token logo as the chain
 *  glyph, per the design (`network: <hashkey logo>`). */
const HASHKEY_LOGO = '/tokens/whsx.webp'

export function NetworkBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-[var(--sea-ink-soft)]">
      network:
      <img
        src={HASHKEY_LOGO}
        alt="HashKey"
        width={16}
        height={16}
        style={{ borderRadius: '9999px', objectFit: 'cover' }}
      />
    </span>
  )
}

/** A simple circular token glyph (initials) so rows read against the glass. */
export function TokenGlyph({
  symbol,
  size = 26,
}: {
  symbol: string
  size?: number
}) {
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

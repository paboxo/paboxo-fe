import { TokenGlyph } from './TokenGlyph'

/** Two overlapping token glyphs (collateral in front, borrow tucked behind) —
 *  the pair icon for a market. */
export function TokenPairGlyph({
  collateralSymbol,
  borrowSymbol,
  size = 34,
}: {
  collateralSymbol: string
  borrowSymbol: string
  size?: number
}) {
  return (
    <span className="relative inline-flex items-center" aria-hidden="true">
      <span className="relative z-10">
        <TokenGlyph symbol={collateralSymbol} size={size} />
      </span>
      <span style={{ marginLeft: -size * 0.4 }}>
        <TokenGlyph symbol={borrowSymbol} size={size} />
      </span>
    </span>
  )
}

import { ChevronDown } from 'lucide-react'
import type { TokenSymbol } from '#/lib/contracts'
import { TokenGlyph } from '#/components/ui/TokenGlyph'

export interface TokenSelectButtonProps {
  symbol: TokenSymbol
  onClick: () => void
}

/** The trigger that opens the token picker — shows the current token + a chevron. */
export function TokenSelectButton({ symbol, onClick }: TokenSelectButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-sm font-semibold text-[var(--sea-ink)] transition-colors hover:border-[var(--sea-ink-soft)]"
    >
      <TokenGlyph symbol={symbol} size={22} />
      {symbol}
      <ChevronDown
        size={16}
        className="text-[var(--sea-ink-soft)]"
        aria-hidden="true"
      />
    </button>
  )
}

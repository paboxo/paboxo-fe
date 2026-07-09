import { TOKENS } from '#/lib/contracts'
import type { TokenSymbol } from '#/lib/contracts'
import { formatTokenAmount } from '#/lib/format'
import { Dialog } from '#/components/ui/Dialog'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import type { TokenBalances } from '#/features/shared/useTokenBalances'

const SYMBOLS = Object.keys(TOKENS) as TokenSymbol[]

export interface TokenSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: TokenSymbol
  onSelect: (symbol: TokenSymbol) => void
  balances: TokenBalances
  isLoading?: boolean
  /** A token that can't be picked (e.g. the token you are swapping from). */
  disabledSymbol?: string
}

/** A token picker as a dialog — each row shows the token and the user's balance. */
export function TokenSelectDialog({
  open,
  onOpenChange,
  selected,
  onSelect,
  balances,
  isLoading,
  disabledSymbol,
}: TokenSelectDialogProps) {
  const pick = (symbol: TokenSymbol) => {
    onSelect(symbol)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Select a token"
      description="Pick the token to swap into."
    >
      <ul className="flex flex-col gap-1 p-3">
        {SYMBOLS.map((symbol) => {
          const disabled = symbol === disabledSymbol
          const isSelected = symbol === selected
          return (
            <li key={symbol}>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => pick(symbol)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors enabled:hover:bg-[var(--chip-bg)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected ? 'bg-[var(--chip-bg)]' : ''
                }`}
              >
                <TokenGlyph symbol={symbol} size={30} />
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-[var(--sea-ink)]">
                    {symbol}
                  </span>
                  {disabled ? (
                    <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
                      Swapping from this token
                    </span>
                  ) : null}
                </span>
                <span className="num text-right text-sm text-[var(--sea-ink)]">
                  {isLoading
                    ? '…'
                    : formatTokenAmount(
                        balances[symbol] ?? 0n,
                        TOKENS[symbol].decimals,
                      )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Dialog>
  )
}

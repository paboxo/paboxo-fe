import { useEffect, useRef, useState } from 'react'
import { ChevronIcon } from '#/components/icons/ChevronIcon'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import type { MarketView } from '#/features/markets/types'

function MarketLabel({ market, size }: { market: MarketView; size: number }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap font-semibold text-[var(--sea-ink)]">
      <TokenPairGlyph
        collateralSymbol={market.collateralSymbol}
        borrowSymbol={market.borrowSymbol}
        collateralAddress={market.collateralAddress}
        borrowAddress={market.borrowAddress}
        size={size}
      />
      {market.collateralSymbol} / {market.borrowSymbol}
    </span>
  )
}

/**
 * A market picker showing each market's pair logo — a native `<select>` can't
 * render logos in its options, so this is a small accessible listbox. Scales to
 * many markets (a scrollable popup) without overflowing a tab row.
 */
export function MarketDropdown({
  markets,
  current,
  onSelect,
}: {
  markets: MarketView[]
  current: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentMarket = markets.find((m) => m.id === current)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm"
        style={{
          border: '1px solid var(--line)',
          background: 'var(--surface-strong)',
        }}
      >
        {currentMarket ? (
          <MarketLabel market={currentMarket} size={20} />
        ) : (
          'Select market'
        )}
        <span
          className="motion-safe:transition-transform text-[var(--sea-ink-soft)]"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <ChevronIcon size={16} />
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Select market"
          className="absolute right-0 z-20 mt-1 flex max-h-64 min-w-full flex-col gap-0.5 overflow-auto rounded-xl p-1"
          style={{
            border: '1px solid var(--line)',
            background: 'var(--surface-strong)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          }}
        >
          {markets.map((market) => (
            <li
              key={market.id}
              role="option"
              aria-selected={market.id === current}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(market.id)
                  setOpen(false)
                }}
                className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm"
                style={{
                  background:
                    market.id === current ? 'var(--sand)' : 'transparent',
                }}
              >
                <MarketLabel market={market} size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

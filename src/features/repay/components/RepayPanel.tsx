import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { ChevronDown } from 'lucide-react'
import { ActionPanel } from '#/components/action/ActionPanel'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import { TOKEN_REGISTRY } from '#/lib/tokens/registry'
import { TOKENS, TOKEN_SYMBOLS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { formatNumber, formatTokenAmount, toNumber } from '#/lib/format'
import {
  useTokenBalance,
  useTokenBalances,
} from '#/features/shared/useTokenBalances'
import type { MarketView } from '#/features/markets/types'
import { useRepay } from '../hooks/useRepay'

interface RepayOption {
  address: Address
  symbol: string
  decimals: number
  isCollateral: boolean
  priceUsd: number | undefined
}

/** Repay-token options: the borrow token (mode A), the position collateral, and
 *  any other registry token (swapped on-chain). Mirrors senja's option set. */
function buildRepayOptions(market: MarketView): RepayOption[] {
  const borrow: RepayOption = {
    address: market.borrowAddress,
    symbol: market.borrowSymbol,
    decimals: market.borrowDecimals,
    isCollateral: false,
    priceUsd: 1,
  }
  const collateral: RepayOption = {
    address: market.collateralAddress,
    symbol: market.collateralSymbol,
    decimals: market.collateralDecimals,
    isCollateral: true,
    priceUsd: market.priceUsd,
  }
  const taken = new Set([
    market.borrowAddress.toLowerCase(),
    market.collateralAddress.toLowerCase(),
  ])
  const others: RepayOption[] = Object.entries(TOKEN_REGISTRY)
    .filter(([addr]) => !taken.has(addr.toLowerCase()))
    .map(([addr, entry]) => ({
      address: addr as Address,
      symbol: entry.label,
      decimals: entry.decimals,
      isCollateral: false,
      priceUsd: undefined,
    }))
  return [borrow, collateral, ...others]
}

/** Compact token picker shown to the right of the "Repay" header. Each row
 *  carries the token logo, symbol, and the user's wallet balance. */
function RepayTokenSelect({
  options,
  selected,
  onSelect,
  balanceByAddress,
}: {
  options: RepayOption[]
  selected: RepayOption
  onSelect: (address: Address) => void
  balanceByAddress: Map<string, bigint>
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-bold text-[var(--sea-ink)] transition-colors hover:border-[var(--sea-ink-soft)]"
      >
        <TokenGlyph
          symbol={selected.symbol}
          address={selected.address}
          size={20}
        />
        {selected.symbol}
        <ChevronDown
          size={16}
          className="text-[var(--sea-ink-soft)]"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <>
          {/* Click-away backdrop. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Repay with token"
            className="island-shell absolute right-0 z-20 mt-1 flex max-h-72 w-64 flex-col gap-0.5 overflow-auto rounded-xl p-1"
          >
            {options.map((o) => {
              const bal = balanceByAddress.get(o.address.toLowerCase())
              return (
                <button
                  key={o.address}
                  type="button"
                  role="option"
                  aria-selected={o.address === selected.address}
                  onClick={() => {
                    onSelect(o.address)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface)]"
                >
                  <TokenGlyph symbol={o.symbol} address={o.address} size={20} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--sea-ink)]">
                    {o.symbol}
                  </span>
                  {o.isCollateral ? (
                    <span className="shrink-0 whitespace-nowrap rounded bg-[var(--surface)] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.04em] text-[var(--sea-ink-soft)]">
                      collateral
                    </span>
                  ) : null}
                  {/* Compact (K/M) in the list; the full amount shows on the
                      "Your Balance" line once the token is selected. */}
                  {bal !== undefined ? (
                    <span className="num shrink-0 text-xs text-[var(--sea-ink-soft)]">
                      {formatTokenAmount(bal, o.decimals, { compact: true })}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * Repay panel (U12). Repays the borrow token directly, the position collateral,
 * or another wallet token (swapped on-chain). The token to pay with is picked
 * from the header selector (logo + wallet balance per row); its wallet balance
 * drives the "Your Balance" line, MAX, and the slider. The hook converts the
 * entered amount to live debt shares and sizes the approval / slippage floor.
 */
export function RepayPanel({
  market,
  belowSlider,
}: {
  market: MarketView
  belowSlider?: ReactNode
}) {
  const { state, revert, repay } = useRepay(market)
  const options = useMemo(() => buildRepayOptions(market), [market])
  const [selectedAddress, setSelectedAddress] = useState<Address>(
    options[0].address,
  )
  const option =
    options.find((o) => o.address === selectedAddress) ?? options[0]

  // Wallet balance of the selected pay-token drives the balance line + MAX.
  const { balance: selectedBalance } = useTokenBalance(option.address)
  const wallet = selectedBalance ?? 0n

  // Per-row balances for the picker, keyed by lowercased token address.
  const { balances } = useTokenBalances()
  const balanceByAddress = useMemo(() => {
    const map = new Map<string, bigint>()
    for (const symbol of TOKEN_SYMBOLS) {
      const bal = balances[symbol]
      if (bal !== undefined) map.set(TOKENS[symbol].address.toLowerCase(), bal)
    }
    return map
  }, [balances])

  const onSubmit = (amountTokens: number) => {
    void repay(parseUnits(amountTokens.toString(), option.decimals), {
      address: option.address,
      decimals: option.decimals,
      isCollateral: option.isCollateral,
    })
  }

  // Repaying with a non-borrow token is swapped on-chain — surface the rate so
  // the user can size the input. Borrow token (pxUSDT ≈ $1) needs no rate.
  const isBorrowToken =
    option.address.toLowerCase() === market.borrowAddress.toLowerCase()
  const rateNode =
    !isBorrowToken && option.priceUsd !== undefined ? (
      <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
        <span>Exchange rate</span>
        <span className="num text-[var(--sea-ink)]">
          1 {option.symbol} ≈{' '}
          {formatNumber(option.priceUsd, { maxFractionDigits: 2 })}{' '}
          {market.borrowSymbol}
        </span>
      </div>
    ) : null

  return (
    <ActionPanel
      title={`Repay ${market.borrowSymbol}`}
      idleLabel="Repay"
      symbol={option.symbol}
      tokenAddress={option.address}
      decimals={option.decimals}
      priceUsd={option.priceUsd}
      balance={wallet}
      maxTokens={toNumber(wallet, option.decimals)}
      preflight={positiveAmount}
      blockReason={staleBlockReason(market)}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      belowSlider={
        rateNode ? (
          <>
            {rateNode}
            {belowSlider}
          </>
        ) : (
          belowSlider
        )
      }
      headerRight={
        <RepayTokenSelect
          options={options}
          selected={option}
          onSelect={setSelectedAddress}
          balanceByAddress={balanceByAddress}
        />
      }
      onSubmit={onSubmit}
    />
  )
}

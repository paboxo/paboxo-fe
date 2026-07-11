import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { ChevronDown } from 'lucide-react'
import { ActionPanel } from '#/components/action/ActionPanel'
import { NETWORK_FEE_HSK } from '#/lib/tx/networkFee'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import { TOKENS, TOKEN_SYMBOLS } from '#/lib/contracts'
import type { Address, TokenSymbol } from '#/lib/contracts'
import { formatNumber, formatTokenAmount, toNumber } from '#/lib/format'
import type { TokenBalances } from '#/features/shared/useTokenBalances'
import { useTokenBalances } from '#/features/shared/useTokenBalances'
import { usePositionBalances } from '#/features/swap/hooks/useSwapCollateralData'
import type { MarketView } from '#/features/markets/types'
import { SWAP_COST_PCT, useRepay } from '../hooks/useRepay'
import { useTokenUsdPrice } from '../hooks/useTokenUsdPrice'

interface RepayOption {
  symbol: TokenSymbol
  address: Address
  decimals: number
  priceUsd: number | undefined
}

/** Every known token is a valid pay token — the borrow token is applied directly,
 *  the rest are swapped on-chain. The borrow token leads (the default). Prices are
 *  known for the borrow token (≈$1) and the market collateral; others are fetched. */
function buildRepayOptions(market: MarketView): RepayOption[] {
  const options = TOKEN_SYMBOLS.map((symbol) => ({
    symbol,
    address: TOKENS[symbol].address,
    decimals: TOKENS[symbol].decimals,
    priceUsd:
      symbol === market.borrowSymbol
        ? 1
        : symbol === market.collateralSymbol
          ? market.priceUsd
          : undefined,
  }))
  return options.sort((a, b) =>
    a.symbol === market.borrowSymbol
      ? -1
      : b.symbol === market.borrowSymbol
        ? 1
        : 0,
  )
}

/** Compact token picker shown to the right of the "Repay" header. Each row carries
 *  the token logo, symbol, and the user's balance in the active source. */
function RepayTokenSelect({
  options,
  selected,
  onSelect,
  balances,
}: {
  options: RepayOption[]
  selected: RepayOption
  onSelect: (symbol: TokenSymbol) => void
  balances: TokenBalances
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
              const bal = balances[o.symbol]
              return (
                <button
                  key={o.address}
                  type="button"
                  role="option"
                  aria-selected={o.symbol === selected.symbol}
                  onClick={() => {
                    onSelect(o.symbol)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface)]"
                >
                  <TokenGlyph symbol={o.symbol} address={o.address} size={20} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--sea-ink)]">
                    {o.symbol}
                  </span>
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
 * Repay panel (U12). Pick any token to repay with (header selector) and toggle
 * whether it comes from the wallet or the position ("Repay with collateral"). The
 * borrow token is applied directly; any other token is swapped on-chain. The active
 * source drives the "Your Balance" line, MAX, and the slider; the hook converts the
 * entered amount to live debt shares.
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
  const [selectedSymbol, setSelectedSymbol] = useState<TokenSymbol>(
    options[0].symbol,
  )
  const [fromPosition, setFromPosition] = useState(false)

  const option = options.find((o) => o.symbol === selectedSymbol) ?? options[0]
  const isBorrowToken =
    option.address.toLowerCase() === market.borrowAddress.toLowerCase()

  // Balances in each source, both keyed by token symbol. The toggle chooses which
  // one drives the balance line, MAX, slider, and the picker's per-row amounts.
  const { balances: walletBalances } = useTokenBalances()
  const { balances: positionBalances } = usePositionBalances(market.poolAddress)
  const sourceBalances = fromPosition ? positionBalances : walletBalances
  const sourceBalance = sourceBalances[option.symbol] ?? 0n

  // The pay-token's USD price: known on the market view for the borrow token /
  // collateral, otherwise fetched. Drives the exchange rate and the ~$ equivalent
  // of the entered amount, so the user can size the repay.
  const { priceUsd: fetchedPrice } = useTokenUsdPrice(
    !isBorrowToken && option.priceUsd === undefined ? option.address : undefined,
  )
  const rateUsd = option.priceUsd ?? fetchedPrice

  const onSubmit = (amountTokens: number) => {
    void repay(parseUnits(amountTokens.toString(), option.decimals), {
      address: option.address,
      decimals: option.decimals,
      fromPosition,
    })
  }

  // Non-borrow tokens are swapped on-chain (DODO) — surface the rate AND the swap
  // cost so the user can size the input and isn't surprised by the debited amount.
  // The contract over-provisions the input ~1% so the output clears the debt. The
  // borrow token (≈$1, no swap) needs neither line.
  const rateNode = !isBorrowToken ? (
    <>
      {rateUsd !== undefined ? (
        <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
          <span>Exchange rate</span>
          <span className="num text-[var(--sea-ink)]">
            1 {option.symbol} ≈ {formatNumber(rateUsd, { maxFractionDigits: 2 })}{' '}
            {market.borrowSymbol}
          </span>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
        <span>Swap cost (max)</span>
        <span className="num text-[var(--sea-ink)]">
          ~{SWAP_COST_PCT}% over debt value
        </span>
      </div>
    </>
  ) : null

  return (
    <ActionPanel
      title={`Repay ${market.borrowSymbol}`}
      idleLabel="Repay"
      symbol={option.symbol}
      tokenAddress={option.address}
      decimals={option.decimals}
      priceUsd={rateUsd}
      balance={sourceBalance}
      balanceLabel={fromPosition ? 'In position' : undefined}
      maxTokens={toNumber(sourceBalance, option.decimals)}
      preflight={positiveAmount}
      blockReason={staleBlockReason(market)}
      networkFeeHsk={NETWORK_FEE_HSK}
      txState={state}
      revert={revert ?? undefined}
      belowSlider={
        <>
          <label
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
              fromPosition
                ? 'border-[var(--palm)] bg-[var(--chip-bg)]'
                : 'border-[var(--line)] bg-[var(--surface)]'
            }`}
          >
            <span className="flex flex-col">
              <span className="text-[0.9rem] font-bold text-[var(--sea-ink)]">
                Repay with collateral
              </span>
              <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
                {fromPosition
                  ? 'Paying from your position — no wallet funds'
                  : 'Pay from wallet'}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={fromPosition}
              aria-label="Repay with collateral"
              onClick={() => setFromPosition((v) => !v)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                fromPosition
                  ? 'border-[var(--palm)] bg-[var(--palm)]'
                  : 'border-[var(--line)] bg-[var(--chip-bg)]'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  fromPosition ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
          {rateNode}
          {belowSlider}
        </>
      }
      headerRight={
        <RepayTokenSelect
          options={options}
          selected={option}
          onSelect={setSelectedSymbol}
          balances={sourceBalances}
        />
      }
      onSubmit={onSubmit}
    />
  )
}

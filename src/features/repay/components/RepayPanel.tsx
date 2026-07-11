import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { ChevronDown } from 'lucide-react'
import { ActionPanel } from '#/components/action/ActionPanel'
import { NETWORK_FEE_HSK } from '#/lib/tx/networkFee'
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
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketView } from '#/features/markets/types'
import { useRepay } from '../hooks/useRepay'
import { useTokenUsdPrice } from '../hooks/useTokenUsdPrice'

interface RepayOption {
  address: Address
  symbol: string
  decimals: number
  priceUsd: number | undefined
}

/** Wallet pay-token options: the borrow token (path A) plus any other registry
 *  token, swapped on-chain (path B). The position collateral (path C) is NOT
 *  here — it is reached through the "from collateral" toggle, since it is sold
 *  from the position rather than charged to the wallet. */
function buildWalletOptions(market: MarketView): RepayOption[] {
  const borrow: RepayOption = {
    address: market.borrowAddress,
    symbol: market.borrowSymbol,
    decimals: market.borrowDecimals,
    priceUsd: 1,
  }
  const taken = new Set([market.borrowAddress.toLowerCase()])
  const others: RepayOption[] = Object.entries(TOKEN_REGISTRY)
    .filter(([addr]) => !taken.has(addr.toLowerCase()))
    .map(([addr, entry]) => ({
      address: addr as Address,
      symbol: entry.label,
      decimals: entry.decimals,
      priceUsd: undefined,
    }))
  return [borrow, ...others]
}

/** Compact wallet-token picker shown to the right of the "Repay" header. Each
 *  row carries the token logo, symbol, and the user's wallet balance. Disabled
 *  while the "from collateral" toggle is on (the token is then the collateral). */
function RepayTokenSelect({
  options,
  selected,
  onSelect,
  balanceByAddress,
  disabled,
}: {
  options: RepayOption[]
  selected: RepayOption
  onSelect: (address: Address) => void
  balanceByAddress: Map<string, bigint>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-bold text-[var(--sea-ink)] transition-colors hover:border-[var(--sea-ink-soft)] disabled:cursor-not-allowed disabled:opacity-50"
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

      {open && !disabled ? (
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

/** The "from collateral" toggle (path C). When on, the debt is repaid by selling
 *  the position's own collateral — no wallet token, no approval. */
function CollateralToggle({
  on,
  onChange,
  collateralSymbol,
  collateralHeld,
}: {
  on: boolean
  onChange: (next: boolean) => void
  collateralSymbol: string
  collateralHeld: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[0.82rem]">
      <span className="flex min-w-0 flex-col">
        <span className="font-bold text-[var(--sea-ink)]">
          Pay from collateral
        </span>
        <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
          Sell {collateralSymbol} in your position ({collateralHeld} held) — no
          wallet funds
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Pay from collateral"
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-[var(--palm)]' : 'bg-[var(--chip-bg)]'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

/**
 * Repay panel (U12). The debt can be paid three ways, all `repayWithSelectedToken`:
 *  - the borrow token from the wallet (path A),
 *  - another wallet token, swapped on-chain (path B) — pick it in the header,
 *  - the position's own collateral (path C) — flip the "Pay from collateral"
 *    toggle; the pool sells the collateral, so no wallet token or approval.
 * The selected source drives the "Your Balance" line, MAX, and the slider; the
 * hook converts the entered amount to live debt shares.
 */
export function RepayPanel({
  market,
  belowSlider,
}: {
  market: MarketView
  belowSlider?: ReactNode
}) {
  const { state, revert, repay } = useRepay(market)
  const walletOptions = useMemo(() => buildWalletOptions(market), [market])
  const [selectedAddress, setSelectedAddress] = useState<Address>(
    walletOptions[0].address,
  )
  const [fromCollateral, setFromCollateral] = useState(false)

  const walletOption =
    walletOptions.find((o) => o.address === selectedAddress) ?? walletOptions[0]
  const collateralOption: RepayOption = {
    address: market.collateralAddress,
    symbol: market.collateralSymbol,
    decimals: market.collateralDecimals,
    priceUsd: market.priceUsd,
  }
  const option = fromCollateral ? collateralOption : walletOption
  const isBorrowToken =
    option.address.toLowerCase() === market.borrowAddress.toLowerCase()

  // Collateral held in this position (path C source) — from the same read as the
  // "Your position" card, so the MAX and the shown balance always agree.
  const { data: position } = useMarketPosition(market.id)
  const collateralHeld =
    position?.supplies.find((s) => s.symbol === market.collateralSymbol)
      ?.balance ?? 0n

  // Wallet balance of the selected pay-token (paths A/B source).
  const { balance: walletBalance } = useTokenBalance(walletOption.address)
  const sourceBalance = fromCollateral ? collateralHeld : (walletBalance ?? 0n)

  // The pay-token's USD price: on the market view for the borrow token / collateral,
  // otherwise fetched from the oracle (e.g. pxWETH). Drives the exchange rate and
  // the ~$ equivalent of the entered amount, so the user can size the repay.
  const { priceUsd: fetchedPrice } = useTokenUsdPrice(
    !isBorrowToken && option.priceUsd === undefined ? option.address : undefined,
  )
  const rateUsd = option.priceUsd ?? fetchedPrice

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
      isCollateral: fromCollateral,
    })
  }

  // Non-borrow tokens (collateral or another token) are swapped on-chain —
  // surface the rate so the user can size the input. Borrow token needs none.
  const rateNode =
    !isBorrowToken && rateUsd !== undefined ? (
      <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
        <span>Exchange rate</span>
        <span className="num text-[var(--sea-ink)]">
          1 {option.symbol} ≈ {formatNumber(rateUsd, { maxFractionDigits: 2 })}{' '}
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
      priceUsd={rateUsd}
      balance={sourceBalance}
      balanceLabel={fromCollateral ? 'Collateral' : undefined}
      maxTokens={toNumber(sourceBalance, option.decimals)}
      preflight={positiveAmount}
      blockReason={staleBlockReason(market)}
      networkFeeHsk={NETWORK_FEE_HSK}
      txState={state}
      revert={revert ?? undefined}
      belowSlider={
        <>
          <CollateralToggle
            on={fromCollateral}
            onChange={setFromCollateral}
            collateralSymbol={market.collateralSymbol}
            collateralHeld={formatTokenAmount(
              collateralHeld,
              market.collateralDecimals,
              { compact: true },
            )}
          />
          {rateNode}
          {belowSlider}
        </>
      }
      headerRight={
        <RepayTokenSelect
          options={walletOptions}
          selected={option}
          onSelect={setSelectedAddress}
          balanceByAddress={balanceByAddress}
          disabled={fromCollateral}
        />
      }
      onSubmit={onSubmit}
    />
  )
}

import { useState } from 'react'
import { parseUnits } from 'viem'
import { MARKETS, TOKENS, getMarketConfig } from '#/lib/contracts'
import type { TokenSymbol } from '#/lib/contracts'
import { formatTokenAmount } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { ActionButton } from '#/components/ui/ActionButton'
import {
  useTokenBalance,
  useTokenBalances,
} from '#/features/shared/useTokenBalances'
import { useSwapCollateral } from '../hooks/useSwapCollateral'
import { TokenSelectButton } from './TokenSelectButton'
import { TokenSelectDialog } from './TokenSelectDialog'

/**
 * Swap collateral (trade the tokens held in a position). Pick the market whose
 * position holds the collateral, an amount, and the token to swap into — chosen
 * from a dialog that lists every token with the user's balance. The hook derives
 * amountOutMinimum from oracle prices.
 */
export function SwapPanel() {
  const [marketId, setMarketId] = useState(MARKETS[0].id)
  const market = getMarketConfig(marketId) ?? MARKETS[0]
  const { state, swap } = useSwapCollateral(market.pool)
  const { balances, isLoading: balancesLoading } = useTokenBalances()

  const [tokenOut, setTokenOut] = useState<TokenSymbol>('pxUSDT')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [pickerOpen, setPickerOpen] = useState(false)

  const collateralSymbol = market.collateralSymbol as TokenSymbol
  // Read the collateral balance by the market's collateral address — the
  // cross-chain pxWHSK shares the pxWHSK symbol but has a distinct address, so a
  // symbol lookup would show the wrong token's balance.
  const { balance: collateralBalance } = useTokenBalance(
    market.collateralAddress,
  )

  const onSwap = () => {
    const out = TOKENS[tokenOut]
    void swap({
      pool: market.pool,
      tokenIn: market.collateralAddress,
      tokenInDecimals: market.collateralDecimals,
      tokenOut: out.address,
      tokenOutDecimals: out.decimals,
      amountIn: parseUnits(amount || '0', market.collateralDecimals),
      slippagePct: Number(slippage) || 0,
    })
  }

  const sameToken = tokenOut === collateralSymbol
  const disabled = amount === '' || Number(amount) <= 0 || sameToken

  return (
    <div className="island-shell mx-auto flex w-full max-w-xl flex-col gap-4 rounded-lg p-5">
      {/* Select Market */}
      <label className="flex flex-col gap-1.5 text-[0.78rem] font-semibold text-[var(--sea-ink-soft)]">
        Select Market
        <div className="relative">
          {/* The pair glyph reflects the selected market (a native select can't
              render it inside an option, so it overlays on the left). */}
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <TokenPairGlyph
              collateralSymbol={market.collateralSymbol}
              borrowSymbol={market.borrowSymbol}
              collateralAddress={market.collateralAddress}
              borrowAddress={TOKENS.pxUSDT.address}
              size={22}
            />
          </span>
          <select
            value={marketId}
            onChange={(event) => setMarketId(event.target.value)}
            className="w-full rounded border border-[var(--palm)] bg-[var(--surface)] py-3 pr-3 pl-14 text-sm font-semibold text-[var(--sea-ink)]"
          >
            {MARKETS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.collateralSymbol} / {entry.borrowSymbol}
              </option>
            ))}
          </select>
        </div>
      </label>

      {/* Sell */}
      <div className="rounded border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
          <span>Sell</span>
          <span className="num">
            Balance:{' '}
            {formatTokenAmount(
              collateralBalance ?? 0n,
              market.collateralDecimals,
            )}{' '}
            {market.collateralSymbol}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <input
            aria-label="Sell amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="num min-w-0 flex-1 bg-transparent text-3xl font-bold text-[var(--sea-ink)] outline-none"
          />
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-bold text-[var(--sea-ink)]">
            <TokenGlyph
              symbol={market.collateralSymbol}
              address={market.collateralAddress}
              size={20}
            />
            {market.collateralSymbol}
          </span>
        </div>
      </div>

      {/* Swap direction (decorative — swap-collateral does not reverse) */}
      <div className="-my-2 flex justify-center">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--palm)]"
          aria-hidden="true"
        >
          ↓
        </span>
      </div>

      {/* Buy */}
      <div className="rounded border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
          <span>Buy</span>
          <span className="num">
            Balance:{' '}
            {balancesLoading
              ? '…'
              : formatTokenAmount(
                  balances[tokenOut] ?? 0n,
                  TOKENS[tokenOut].decimals,
                )}{' '}
            {tokenOut}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Read-only estimated output — a live quote is not wired yet. */}
          <span className="num text-3xl font-bold text-[var(--sea-ink-soft)]">
            —
          </span>
          <TokenSelectButton
            symbol={tokenOut}
            onClick={() => setPickerOpen(true)}
          />
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 text-[0.82rem] text-[var(--sea-ink-soft)]">
        <div className="flex items-center justify-between">
          <span>Exchange Rate</span>
          <span className="num text-[var(--sea-ink)]">—</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Network Fee</span>
          <span className="num text-[var(--sea-ink)]">~$0.42</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Slippage Tolerance</span>
          <span className="inline-flex gap-1">
            {['0.1', '0.5', '1.0'].map((value) => {
              const isActive = slippage === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSlippage(value)}
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? 'rounded bg-[var(--palm)] px-2 py-1 text-xs font-bold text-white'
                      : 'rounded bg-[var(--chip-bg)] px-2 py-1 text-xs font-bold text-[var(--sea-ink)]'
                  }
                >
                  {value}%
                </button>
              )
            })}
          </span>
        </div>
      </div>

      {sameToken ? (
        <p className="m-0 text-[0.78rem]" style={{ color: 'var(--danger)' }}>
          Pick a different token to swap into.
        </p>
      ) : null}

      <ActionButton
        state={state}
        idleLabel="Swap"
        disabled={disabled}
        onClick={onSwap}
      />

      <TokenSelectDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={tokenOut}
        onSelect={setTokenOut}
        balances={balances}
        isLoading={balancesLoading}
        disabledSymbol={collateralSymbol}
      />
    </div>
  )
}

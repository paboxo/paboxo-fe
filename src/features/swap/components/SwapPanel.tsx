import { useState } from 'react'
import { parseUnits } from 'viem'
import { ChevronDown } from 'lucide-react'
import { MARKETS, TOKENS, getMarketConfig } from '#/lib/contracts'
import type { TokenSymbol } from '#/lib/contracts'
import { formatTokenAmount } from '#/lib/format'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { ActionButton } from '#/components/ui/ActionButton'
import { useTokenBalances } from '#/features/shared/useTokenBalances'
import { useSwapCollateral } from '../hooks/useSwapCollateral'
import {
  usePositionBalances,
  useSwapQuote,
} from '../hooks/useSwapCollateralData'
import { TokenSelectButton } from './TokenSelectButton'
import { TokenSelectDialog } from './TokenSelectDialog'

/**
 * Swap collateral (senja `trade-collateral` model). Pick a pool, then swap the
 * collateral the position holds — flexibly, into any token. The "Sell" balance
 * is the token the user holds INSIDE the position (not the wallet); the output +
 * rate come from the oracle prices; nothing needs approval (the token is already
 * in the position).
 */
export function SwapPanel() {
  const [marketId, setMarketId] = useState(MARKETS[0].id)
  const market = getMarketConfig(marketId) ?? MARKETS[0]
  const { state, swap } = useSwapCollateral(market.pool)

  const [sellSymbol, setSellSymbol] = useState<TokenSymbol>(
    market.collateralSymbol as TokenSymbol,
  )
  const [buySymbol, setBuySymbol] = useState<TokenSymbol>('pxUSDT')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [picker, setPicker] = useState<'sell' | 'buy' | null>(null)
  const [marketOpen, setMarketOpen] = useState(false)

  const sell = TOKENS[sellSymbol]
  const buy = TOKENS[buySymbol]

  // Sell balances come from the POSITION (collateral held in the pool); Buy-side
  // balances are the wallet's (informational).
  const { balances: positionBalances, isLoading: positionLoading } =
    usePositionBalances(market.pool)
  const { balances: walletBalances, isLoading: walletLoading } =
    useTokenBalances()

  const amountIn = (() => {
    try {
      return parseUnits(amount || '0', sell.decimals)
    } catch {
      return 0n
    }
  })()
  const { estimatedOut, rate } = useSwapQuote(
    sell.address,
    sell.decimals,
    buy.address,
    buy.decimals,
    amountIn,
  )

  const sellBalance = positionBalances[sellSymbol] ?? 0n
  const sameToken = sellSymbol === buySymbol
  const overBalance = amountIn > sellBalance
  const disabled =
    amount === '' || Number(amount) <= 0 || sameToken || overBalance

  const onSwap = () => {
    void swap({
      pool: market.pool,
      tokenIn: sell.address,
      tokenInDecimals: sell.decimals,
      tokenOut: buy.address,
      tokenOutDecimals: buy.decimals,
      amountIn,
      slippagePct: Number(slippage) || 0,
    })
  }

  return (
    <div className="island-shell mx-auto flex w-full max-w-xl flex-col gap-4 rounded-lg p-5">
      {/* Select Market — a custom dropdown so each option shows its pair glyph. */}
      <div className="flex flex-col gap-1.5 text-[0.78rem] font-semibold text-[var(--sea-ink-soft)]">
        Select Market
        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={marketOpen}
            onClick={() => setMarketOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded border border-[var(--palm)] bg-[var(--surface)] px-3 py-3 text-sm font-bold text-[var(--sea-ink)]"
          >
            <span className="flex items-center gap-3">
              <TokenPairGlyph
                collateralSymbol={market.collateralSymbol}
                borrowSymbol={market.borrowSymbol}
                collateralAddress={market.collateralAddress}
                borrowAddress={TOKENS.pxUSDT.address}
                size={22}
              />
              {market.collateralSymbol} / {market.borrowSymbol}
            </span>
            <ChevronDown
              size={16}
              className="text-[var(--sea-ink-soft)]"
              aria-hidden="true"
            />
          </button>
          {marketOpen ? (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMarketOpen(false)}
              />
              <ul
                role="listbox"
                className="island-shell absolute z-20 mt-1 w-full overflow-hidden rounded"
              >
                {MARKETS.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setMarketId(entry.id)
                        setMarketOpen(false)
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--chip-bg)]"
                    >
                      <TokenPairGlyph
                        collateralSymbol={entry.collateralSymbol}
                        borrowSymbol={entry.borrowSymbol}
                        collateralAddress={entry.collateralAddress}
                        borrowAddress={TOKENS.pxUSDT.address}
                        size={20}
                      />
                      {entry.collateralSymbol} / {entry.borrowSymbol}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      {/* Sell — the collateral held in the position (flexible token). */}
      <div className="rounded border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
          <span>Sell</span>
          <span className="num">
            Balance:{' '}
            {positionLoading
              ? '…'
              : formatTokenAmount(sellBalance, sell.decimals)}{' '}
            {sellSymbol}
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
          <TokenSelectButton
            symbol={sellSymbol}
            onClick={() => setPicker('sell')}
          />
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

      {/* Buy — estimated output token. */}
      <div className="rounded border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between text-[0.78rem] text-[var(--sea-ink-soft)]">
          <span>Buy</span>
          <span className="num">
            Balance:{' '}
            {walletLoading
              ? '…'
              : formatTokenAmount(walletBalances[buySymbol] ?? 0n, buy.decimals)}{' '}
            {buySymbol}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="num text-3xl font-bold text-[var(--sea-ink)]">
            {amount === '' ? '—' : formatTokenAmount(estimatedOut, buy.decimals)}
          </span>
          <TokenSelectButton
            symbol={buySymbol}
            onClick={() => setPicker('buy')}
          />
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 text-[0.82rem] text-[var(--sea-ink-soft)]">
        <div className="flex items-center justify-between">
          <span>Exchange Rate</span>
          <span className="num text-[var(--sea-ink)]">
            {rate > 0
              ? `1 ${sellSymbol} = ${rate.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })} ${buySymbol}`
              : '—'}
          </span>
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
      ) : overBalance ? (
        <p className="m-0 text-[0.78rem]" style={{ color: 'var(--danger)' }}>
          You don&apos;t hold that much {sellSymbol} in this position.
        </p>
      ) : null}

      <ActionButton
        state={state}
        idleLabel="Swap"
        disabled={disabled}
        onClick={onSwap}
      />

      <TokenSelectDialog
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null)
        }}
        selected={picker === 'sell' ? sellSymbol : buySymbol}
        onSelect={(symbol) => {
          if (picker === 'sell') setSellSymbol(symbol)
          else setBuySymbol(symbol)
        }}
        balances={picker === 'sell' ? positionBalances : walletBalances}
        isLoading={picker === 'sell' ? positionLoading : walletLoading}
        disabledSymbol={picker === 'sell' ? buySymbol : sellSymbol}
      />
    </div>
  )
}

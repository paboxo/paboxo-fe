import { useState } from 'react'
import { parseUnits } from 'viem'
import { MARKETS, TOKENS, getMarketConfig } from '#/lib/contracts'
import type { TokenSymbol } from '#/lib/contracts'
import { formatTokenAmount } from '#/lib/format'
import { MoneyInput } from '#/components/ui/MoneyInput'
import { ActionButton } from '#/components/ui/ActionButton'
import { useTokenBalances } from '#/features/shared/useTokenBalances'
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

  const collateralSymbol = market.collateralSymbol
  const collateralBalance = balances[collateralSymbol as TokenSymbol]

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
    <div className="island-shell flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <h2 className="display-title m-0 text-lg font-semibold">
          Swap collateral
        </h2>
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
          Trade the collateral held in your position — routed through the DEX,
          staying inside the position.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-[0.78rem] text-[var(--sea-ink-soft)]">
        Position (market)
        <select
          value={marketId}
          onChange={(event) => setMarketId(event.target.value)}
          className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-sm text-[var(--sea-ink)]"
        >
          {MARKETS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.collateralSymbol} market
            </option>
          ))}
        </select>
      </label>

      <MoneyInput
        symbol={market.collateralSymbol}
        decimals={market.collateralDecimals}
        value={amount}
        onChange={setAmount}
        balance={collateralBalance}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[0.78rem] text-[var(--sea-ink-soft)]">
            Swap into
          </span>
          <span className="num text-[0.72rem] text-[var(--sea-ink-soft)]">
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
        <TokenSelectButton
          symbol={tokenOut}
          onClick={() => setPickerOpen(true)}
        />
      </div>

      <label className="flex items-center justify-between gap-2 text-[0.78rem] text-[var(--sea-ink-soft)]">
        Slippage tolerance
        <span className="flex items-center gap-1">
          <input
            aria-label="Slippage tolerance"
            inputMode="decimal"
            value={slippage}
            onChange={(event) => setSlippage(event.target.value)}
            className="num w-16 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-right text-sm text-[var(--sea-ink)]"
          />
          %
        </span>
      </label>

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

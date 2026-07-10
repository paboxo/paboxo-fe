import { useState } from 'react'
import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import { formatTokenAmount, formatUsd, toNumber } from '#/lib/format'
import type { MarketView } from '#/features/markets/types'
import { useWithdraw } from '#/features/withdraw/hooks/useWithdraw'
import { useTokenBalance } from '#/features/shared/useTokenBalances'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { useSupplyLiquidity } from '../hooks/useSupplyLiquidity'

type LiquidityAction = 'supply' | 'withdraw'

const TABS: { key: LiquidityAction; label: string }[] = [
  { key: 'supply', label: 'Supply' },
  { key: 'withdraw', label: 'Withdraw' },
]

const positiveAmount = (amountTokens: number): PreflightResult =>
  amountTokens > 0
    ? { enabled: true }
    : { enabled: false, reason: 'Enter an amount greater than zero.' }

/**
 * Earn-side liquidity action host (U2, R6, AE1). Supplies pxUSDT *liquidity* to
 * the pool and withdraws it. The Supply tab caps at the user's wallet pxUSDT
 * balance; the Withdraw tab caps at what the user has supplied in *this* pool
 * (read from the pool via `useMarketPosition`), so they can only pull out what
 * they put in. Reuses the existing hooks unchanged (no new write logic).
 */
export function SupplyLiquidityPanel({ market }: { market: MarketView }) {
  const [active, setActive] = useState<LiquidityAction>('supply')
  const supplyLiquidity = useSupplyLiquidity(market)
  const withdraw = useWithdraw(market)
  const decimals = market.borrowDecimals

  // Wallet pxUSDT balance (supply cap) and the user's supplied liquidity in this
  // isolated pool (withdraw cap).
  const { balance: walletBalance } = useTokenBalance(market.borrowAddress)
  const { data: position } = useMarketPosition(market.id)
  const suppliedRow = position?.supplies.find(
    (row) => row.symbol === market.borrowSymbol,
  )
  const suppliedBalance = suppliedRow?.balance ?? 0n
  const wallet = walletBalance ?? 0n

  const onSupply = (amountTokens: number) => {
    void supplyLiquidity.supply(parseUnits(amountTokens.toString(), decimals))
  }

  const onWithdraw = (amountTokens: number) => {
    void withdraw.withdrawLiquidity(
      parseUnits(amountTokens.toString(), decimals),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="island-shell flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
        <span className="text-[var(--sea-ink-soft)]">
          Supplied in this pool
        </span>
        <span className="num font-semibold text-[var(--sea-ink)]">
          {formatTokenAmount(suppliedBalance, decimals)} {market.borrowSymbol}
          {suppliedRow ? (
            <span className="text-[var(--sea-ink-soft)]">
              {' '}
              · {formatUsd(suppliedRow.valueUsd)}
            </span>
          ) : null}
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Liquidity actions"
        className="island-shell flex gap-1 rounded-full p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-bold ${
              active === tab.key
                ? 'text-[#f3faf5]'
                : 'text-[var(--sea-ink-soft)]'
            }`}
            style={
              active === tab.key ? { background: 'var(--palm)' } : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'supply' ? (
        <ActionPanel
          title={`Supply ${market.borrowSymbol}`}
          idleLabel="Supply"
          symbol={market.borrowSymbol}
          decimals={decimals}
          priceUsd={1}
          balance={wallet}
          maxTokens={toNumber(wallet, decimals)}
          maxLabel="Wallet balance"
          preflight={positiveAmount}
          reviewApy={market.supplyApy}
          networkFeeUsd={0.42}
          txState={supplyLiquidity.state}
          revert={supplyLiquidity.revert ?? undefined}
          onSubmit={onSupply}
        />
      ) : (
        <ActionPanel
          title={`Withdraw ${market.borrowSymbol}`}
          idleLabel="Withdraw"
          symbol={market.borrowSymbol}
          decimals={decimals}
          priceUsd={1}
          balance={suppliedBalance}
          maxTokens={toNumber(suppliedBalance, decimals)}
          maxLabel="Supplied"
          preflight={positiveAmount}
          networkFeeUsd={0.42}
          txState={withdraw.state}
          revert={withdraw.revert ?? undefined}
          onSubmit={onWithdraw}
        />
      )}
    </div>
  )
}

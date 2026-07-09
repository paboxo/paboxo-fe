import { useState } from 'react'
import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import { TOKENS } from '#/lib/contracts'
import type { MarketView } from '#/features/markets/types'
import { useWithdraw } from '#/features/withdraw/hooks/useWithdraw'
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
 * the pool and withdraws it — the lender counterpart to the collateral
 * `SupplyPanel`. Reuses `useSupplyLiquidity` and `useWithdraw.withdrawLiquidity`
 * unchanged (no new write logic); the two tabs keep supply and withdraw in one
 * card without ever offering a collateral action.
 */
export function SupplyLiquidityPanel({ market }: { market: MarketView }) {
  const [active, setActive] = useState<LiquidityAction>('supply')
  const supplyLiquidity = useSupplyLiquidity(market)
  const withdraw = useWithdraw(market)
  const decimals = TOKENS.pxUSDT.decimals

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
          maxTokens={1000}
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
          maxTokens={1000}
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

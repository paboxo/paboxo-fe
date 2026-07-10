import { useState } from 'react'
import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { toNumber } from '#/lib/format'
import {
  positiveAmount,
  staleBlockReason,
} from '#/features/markets/gates'
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

/**
 * Earn-side liquidity action host. Supplies pxUSDT *liquidity* to the pool and
 * withdraws it. The Supply tab caps at the user's wallet pxUSDT balance; the
 * Withdraw tab caps at what the user has supplied in *this* pool.
 *
 * A stale collateral price blocks **Supply** but not **Withdraw** (R10 says
 * "write actions"; this narrows it deliberately). Supplying adds exposure to a
 * pool whose collateral cannot be valued. Withdrawing only removes it, and
 * `withdrawLiquidity` makes no on-chain oracle call at all (AS8) — blocking it
 * would trap a lender's own funds behind a feed they never depended on.
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
          blockReason={staleBlockReason(market)}
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

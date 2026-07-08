import { useState } from 'react'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import type { TxState } from '#/lib/tx/txState'
import { SupplyPanel } from '#/features/supply/components/SupplyPanel'
import { BorrowPanel } from '#/features/borrow/components/BorrowPanel'
import type { MarketView } from '../types'

type ActionKey = 'supply' | 'borrow' | 'repay' | 'withdraw'

const TABS: { key: ActionKey; label: string }[] = [
  { key: 'supply', label: 'Supply' },
  { key: 'borrow', label: 'Borrow' },
  { key: 'repay', label: 'Repay' },
  { key: 'withdraw', label: 'Withdraw' },
]

const DEMO_CURRENT_HF = 2.41

/**
 * The market's action host (U20). One tabbed panel that every write unit mounts
 * into — Supply/Borrow/Repay/Withdraw here, with Liquidate/Delegation/create
 * reached from their own entry points. The submit/pre-flight flow is demo-wired
 * until the write phase (U9–U12) replaces it with the real hooks + pre-flight
 * gate; the tab host and its layout stay.
 */
export function MarketActions({ market }: { market: MarketView }) {
  const [active, setActive] = useState<ActionKey>('supply')
  const [txState, setTxState] = useState<TxState>('idle')

  // Borrow/repay act on the borrow token (pxUSDT); supply/withdraw on collateral.
  const onBorrowToken = active === 'borrow' || active === 'repay'
  const symbol = onBorrowToken ? market.borrowSymbol : market.collateralSymbol
  const decimals = onBorrowToken ? 6 : market.collateralDecimals
  const priceUsd = onBorrowToken ? 1 : market.priceUsd
  const label = TABS.find((tab) => tab.key === active)?.label ?? 'Supply'

  const preflight = (amountTokens: number): PreflightResult =>
    amountTokens * priceUsd <= market.availableLiquidityUsd
      ? { enabled: true }
      : { enabled: false, reason: 'Not enough liquidity in this pool.' }

  const projectHf = (amountTokens: number) =>
    Math.max(1.0, DEMO_CURRENT_HF - (amountTokens * priceUsd) / 4000)

  const submit = () => {
    setTxState('signing')
    window.setTimeout(() => setTxState('pending'), 400)
    window.setTimeout(() => setTxState('confirmed'), 1400)
  }

  const selectTab = (key: ActionKey) => {
    setActive(key)
    setTxState('idle')
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Market actions"
        className="island-shell flex gap-1 rounded-full p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => selectTab(tab.key)}
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

      {active === 'supply' && <SupplyPanel market={market} />}
      {active === 'borrow' && <BorrowPanel market={market} />}
      {(active === 'repay' || active === 'withdraw') && (
        // Repay/Withdraw stay demo-wired until U12 lands their hooks.
        <ActionPanel
          title={`${label} ${symbol}`}
          idleLabel={label}
          symbol={symbol}
          decimals={decimals}
          priceUsd={priceUsd}
          maxTokens={1000}
          currentHf={DEMO_CURRENT_HF}
          projectHf={projectHf}
          preflight={preflight}
          reviewApy={market.borrowApr}
          networkFeeUsd={0.42}
          txState={txState}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

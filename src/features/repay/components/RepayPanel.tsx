import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import type { MarketView } from '#/features/markets/types'
import { useRepay } from '../hooks/useRepay'

/**
 * Repay panel (U12, mode A). Repays the borrow token (pxUSDT); the hook converts
 * the asset amount to live debt shares and approves the exact amount.
 */
export function RepayPanel({ market }: { market: MarketView }) {
  const { state, revert, repay } = useRepay(market)

  const onSubmit = (amountTokens: number) => {
    void repay(parseUnits(amountTokens.toString(), market.borrowDecimals))
  }

  return (
    <ActionPanel
      title={`Repay ${market.borrowSymbol}`}
      idleLabel="Repay"
      symbol={market.borrowSymbol}
      decimals={market.borrowDecimals}
      priceUsd={1}
      maxTokens={1000}
      preflight={positiveAmount}
      blockReason={staleBlockReason(market)}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      onSubmit={onSubmit}
    />
  )
}

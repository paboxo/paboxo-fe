import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import {
  positiveAmount,
  staleBlockReason,
} from '#/features/markets/gates'
import type { MarketView } from '#/features/markets/types'
import { useWithdraw } from '../hooks/useWithdraw'

/**
 * Withdraw panel (U12). Withdraws collateral; the hook re-checks health via the
 * pre-flight gate before signing. Funds always return to the owner.
 */
export function WithdrawPanel({ market }: { market: MarketView }) {
  const { state, revert, withdrawCollateral } = useWithdraw(market)

  const onSubmit = (amountTokens: number) => {
    void withdrawCollateral(
      parseUnits(amountTokens.toString(), market.collateralDecimals),
    )
  }

  return (
    <ActionPanel
      title={`Withdraw ${market.collateralSymbol}`}
      idleLabel="Withdraw"
      symbol={market.collateralSymbol}
      decimals={market.collateralDecimals}
      priceUsd={market.priceUsd}
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

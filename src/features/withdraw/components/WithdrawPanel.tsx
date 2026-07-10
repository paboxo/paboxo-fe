import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { positiveAmount } from '#/features/markets/gates'
import type { MarketView } from '#/features/markets/types'
import { useWithdraw } from '../hooks/useWithdraw'

/**
 * Withdraw panel (U12). Withdraws collateral; funds always return to the owner.
 *
 * Deliberately NOT gated on a stale price (unlike Supply/Borrow, and matching
 * `staleBlockReason`'s own note). On-chain `isHealthy` returns early for a
 * debt-free position without ever reading the collateral oracle, so a borrower
 * who has repaid can always retrieve their collateral — blocking on a stale
 * feed would trap those funds behind a price the withdrawal never consults.
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
      tokenAddress={market.collateralAddress}
      decimals={market.collateralDecimals}
      priceUsd={market.priceUsd}
      maxTokens={1000}
      preflight={positiveAmount}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      onSubmit={onSubmit}
    />
  )
}

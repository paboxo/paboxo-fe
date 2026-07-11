import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { toNumber } from '#/lib/format'
import { positiveAmount } from '#/features/markets/gates'
import { usePositionTokenBalance } from '#/features/position/hooks/usePositionTokenBalance'
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
export function WithdrawPanel({
  market,
  belowSlider,
}: {
  market: MarketView
  belowSlider?: ReactNode
}) {
  const { state, revert, withdrawCollateral } = useWithdraw(market)
  // Max is the collateral the user actually holds in this pool position.
  const { balance } = usePositionTokenBalance(
    market.poolAddress,
    market.collateralAddress,
  )
  const collateral = balance ?? 0n

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
      balance={collateral}
      maxTokens={toNumber(collateral, market.collateralDecimals)}
      maxLabel="Supplied"
      preflight={positiveAmount}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      belowSlider={belowSlider}
      onSubmit={onSubmit}
    />
  )
}

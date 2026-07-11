import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { toNumber } from '#/lib/format'
import { positiveAmount } from '#/features/markets/gates'
import { useTokenBalance } from '#/features/shared/useTokenBalances'
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
  collateralBalance,
}: {
  market: MarketView
  belowSlider?: ReactNode
  /** Collateral the user holds in this pool position, in collateral base units.
   *  Sourced from the same position read as the "Your position" card, so the
   *  withdraw max/validation and the displayed collateral always agree. */
  collateralBalance?: bigint
}) {
  const { state, revert, withdrawCollateral } = useWithdraw(market)
  // Withdraw is bounded by the supplied collateral, never the wallet — that is
  // the MAX/validation cap. The "Your Balance" line shows the wallet balance so
  // the user can watch the withdrawn collateral land back in their wallet.
  const collateral = collateralBalance ?? 0n
  const { balance } = useTokenBalance(market.collateralAddress)
  const wallet = balance ?? 0n

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
      balance={wallet}
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

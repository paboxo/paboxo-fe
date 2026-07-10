import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import type { MarketView } from '#/features/markets/types'
import { STALE_PRICE_REASON } from '#/features/markets/components/PoolBadges'
import { useWithdraw } from '../hooks/useWithdraw'

/**
 * Withdraw panel (U12). Withdraws collateral; the hook re-checks health via the
 * pre-flight gate before signing. Funds always return to the owner.
 */
export function WithdrawPanel({ market }: { market: MarketView }) {
  const { state, revert, withdrawCollateral } = useWithdraw(market)

  const preflight = (amountTokens: number): PreflightResult =>
    amountTokens > 0
      ? { enabled: true }
      : { enabled: false, reason: 'Enter an amount greater than zero.' }

  // R10: a stale price feed pauses writes on this pool, reason surfaced (AS8 —
  // withdrawLiquidity makes no oracle call, so this disable is the only gate).
  const staleGate: PreflightResult = market.priceStale
    ? { enabled: false, reason: STALE_PRICE_REASON }
    : { enabled: true }

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
      preflight={preflight}
      blockReason={staleGate.enabled ? undefined : staleGate.reason}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      onSubmit={onSubmit}
    />
  )
}

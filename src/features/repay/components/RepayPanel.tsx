import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import type { MarketView } from '#/features/markets/types'
import { STALE_PRICE_REASON } from '#/features/markets/components/PoolBadges'
import { useRepay } from '../hooks/useRepay'

/**
 * Repay panel (U12, mode A). Repays the borrow token (pxUSDT); the hook converts
 * the asset amount to live debt shares and approves the exact amount.
 */
export function RepayPanel({ market }: { market: MarketView }) {
  const { state, revert, repay } = useRepay(market)

  const preflight = (amountTokens: number): PreflightResult =>
    amountTokens > 0
      ? { enabled: true }
      : { enabled: false, reason: 'Enter an amount greater than zero.' }

  // R10: a stale price feed pauses writes on this pool, reason surfaced.
  const staleGate: PreflightResult = market.priceStale
    ? { enabled: false, reason: STALE_PRICE_REASON }
    : { enabled: true }

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
      preflight={preflight}
      blockReason={staleGate.enabled ? undefined : staleGate.reason}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      onSubmit={onSubmit}
    />
  )
}

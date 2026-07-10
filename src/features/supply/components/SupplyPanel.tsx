import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import type { MarketView } from '#/features/markets/types'
import { STALE_PRICE_REASON } from '#/features/markets/components/PoolBadges'
import { useSupplyCollateral } from '../hooks/useSupplyCollateral'

/**
 * Supply collateral panel (U10). Wires the amount input to the real supply hook
 * through the shared write wrapper; the on-chain pre-flight runs inside the hook
 * (live reads), this lightweight check only guards a non-positive amount.
 */
export function SupplyPanel({ market }: { market: MarketView }) {
  const { state, revert, supply } = useSupplyCollateral(market)

  const preflight = (amountTokens: number): PreflightResult =>
    amountTokens > 0
      ? { enabled: true }
      : { enabled: false, reason: 'Enter an amount greater than zero.' }

  // R10: a stale price feed pauses writes, with the reason surfaced (AS8 —
  // supplyCollateral makes no oracle call, so this disable is the only gate).
  const staleGate: PreflightResult = market.priceStale
    ? { enabled: false, reason: STALE_PRICE_REASON }
    : { enabled: true }

  const onSubmit = (amountTokens: number) => {
    void supply(parseUnits(amountTokens.toString(), market.collateralDecimals))
  }

  return (
    <ActionPanel
      title={`Supply ${market.collateralSymbol}`}
      idleLabel="Supply"
      symbol={market.collateralSymbol}
      decimals={market.collateralDecimals}
      priceUsd={market.priceUsd}
      maxTokens={1000}
      preflight={preflight}
      blockReason={staleGate.enabled ? undefined : staleGate.reason}
      reviewApy={market.supplyApy}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      onSubmit={onSubmit}
    />
  )
}

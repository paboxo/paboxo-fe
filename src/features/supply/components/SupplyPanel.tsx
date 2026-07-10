import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import type { MarketView } from '#/features/markets/types'
import { useSupplyCollateral } from '../hooks/useSupplyCollateral'

/**
 * Supply collateral panel (U10). Wires the amount input to the real supply hook
 * through the shared write wrapper; the on-chain pre-flight runs inside the hook
 * (live reads), this lightweight check only guards a non-positive amount.
 */
export function SupplyPanel({ market }: { market: MarketView }) {
  const { state, revert, supply } = useSupplyCollateral(market)

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
      preflight={positiveAmount}
      blockReason={staleBlockReason(market)}
      reviewApy={market.supplyApy}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      onSubmit={onSubmit}
    />
  )
}

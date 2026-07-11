import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { toNumber } from '#/lib/format'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import { useTokenBalance } from '#/features/shared/useTokenBalances'
import type { MarketView } from '#/features/markets/types'
import { useSupplyCollateral } from '../hooks/useSupplyCollateral'

/**
 * Supply collateral panel (U10). Wires the amount input to the real supply hook
 * through the shared write wrapper; the on-chain pre-flight runs inside the hook
 * (live reads), this lightweight check only guards a non-positive amount.
 */
export function SupplyPanel({ market }: { market: MarketView }) {
  const { state, revert, supply } = useSupplyCollateral(market)
  // Supplying collateral spends the wallet — Max is the wallet balance.
  const { balance } = useTokenBalance(market.collateralAddress)
  const wallet = balance ?? 0n

  const onSubmit = (amountTokens: number) => {
    void supply(parseUnits(amountTokens.toString(), market.collateralDecimals))
  }

  return (
    <ActionPanel
      title={`Supply ${market.collateralSymbol}`}
      idleLabel="Supply"
      symbol={market.collateralSymbol}
      tokenAddress={market.collateralAddress}
      decimals={market.collateralDecimals}
      priceUsd={market.priceUsd}
      balance={wallet}
      maxTokens={toNumber(wallet, market.collateralDecimals)}
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

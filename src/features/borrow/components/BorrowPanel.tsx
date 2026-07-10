import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import type { MarketView } from '#/features/markets/types'
import { useBorrow } from '../hooks/useBorrow'

/**
 * Borrow panel (U11). Borrows the pool's borrow token (pxUSDT). The real
 * max-borrow / liquidity / health checks run inside the hook's pre-flight.
 *
 * The amount is scaled by `market.borrowDecimals` — the value the enrichment
 * batch read from the token and checked against the registry (R31). The registry
 * constant is never used here: a pool whose decimals could not be verified is
 * dropped upstream, so a rendered market always carries a trusted number.
 */
export function BorrowPanel({ market }: { market: MarketView }) {
  const { state, revert, borrow } = useBorrow(market)

  const preflight = (amountTokens: number): PreflightResult =>
    amountTokens > 0
      ? { enabled: true }
      : { enabled: false, reason: 'Enter an amount greater than zero.' }

  const onSubmit = (amountTokens: number) => {
    void borrow(parseUnits(amountTokens.toString(), market.borrowDecimals))
  }

  return (
    <ActionPanel
      title={`Borrow ${market.borrowSymbol}`}
      idleLabel="Borrow"
      symbol={market.borrowSymbol}
      decimals={market.borrowDecimals}
      priceUsd={1}
      maxTokens={1000}
      preflight={preflight}
      reviewApy={market.borrowApr}
      networkFeeUsd={0.42}
      txState={state}
      revert={revert ?? undefined}
      onSubmit={onSubmit}
    />
  )
}

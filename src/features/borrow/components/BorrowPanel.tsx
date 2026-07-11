import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { CROSS_CHAIN } from '#/lib/contracts'
import { formatNumber } from '#/lib/format'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { ReviewRow } from '#/components/action/ReviewBlock'
import { CrossChainTracker } from '#/components/ui/CrossChainTracker'
import { NETWORK_FEE_HSK } from '#/lib/tx/networkFee'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import { useTokenBalance } from '#/features/shared/useTokenBalances'
import { useCrossChainTransfer } from '#/features/crosschain/useCrossChainTransfer'
import type { MarketView } from '#/features/markets/types'
import { useBorrow } from '../hooks/useBorrow'
import {
  useCrossChainBorrow,
  useCrossChainBorrowFee,
} from '../hooks/useCrossChainBorrow'
import { ChainSelectButton } from './ChainSelectButton'
import { ChainSelectDialog } from './ChainSelectDialog'
import type { Destination } from './ChainSelectDialog'

/**
 * Borrow panel (U11, U6). Borrows pxUSDT against HashKey collateral. A destination
 * picker chooses where the funds land: HashKey (same-chain, unchanged) or Base
 * (cross-chain — the borrow bridges the pxUSDT to the user's EOA on Base). The
 * borrow tx always signs on HashKey; only the routing and the CCIP fee differ.
 */
export function BorrowPanel({
  market,
  belowSlider,
}: {
  market: MarketView
  belowSlider?: ReactNode
}) {
  const [destination, setDestination] = useState<Destination>('hashkey')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [amountTokens, setAmountTokens] = useState(0)
  // The last Base amount submitted, held until the tx confirms and the tracker starts.
  const [pending, setPending] = useState<string | null>(null)
  const isBase = destination === 'base'
  const baseEnabled = CROSS_CHAIN.borrowBridge.enabled

  const same = useBorrow(market)
  const cross = useCrossChainBorrow(market)
  const active = isBase ? cross : same

  const feeQuery = useCrossChainBorrowFee(market, amountTokens, isBase)
  const { transfer, start, update, clear } = useCrossChainTransfer('borrow')

  // Wallet balance of the borrow token, shown for context (same-chain funds land
  // here). It does not cap the borrow — max-borrow does.
  const { balance } = useTokenBalance(market.borrowAddress)
  const wallet = balance ?? 0n

  // Start and advance the tracker off the bridge status (R10, R11). The tracker
  // only appears once the borrow tx confirms (status 'bridging') — never before
  // signing — so a rejected/failed borrow leaves no stuck transfer. In live mode
  // the status caps at 'bridging', so it never falsely reports arrival.
  useEffect(() => {
    if (!transfer && cross.bridgeStatus === 'bridging' && pending !== null) {
      start({
        id: 'xfer',
        sourceChain: 'HashKey',
        destChain: 'Base',
        amount: pending,
        symbol: market.borrowSymbol,
        step: 'relaying',
        startedAt: Date.now(),
        etaSeconds: 300,
        sourceTxUrl: '#',
      })
      setPending(null)
    } else if (
      transfer &&
      cross.bridgeStatus === 'delivered' &&
      transfer.step !== 'arrived'
    ) {
      update({ step: 'arrived', destTxUrl: '#' })
    }
  }, [cross.bridgeStatus, transfer, pending, start, update, market.borrowSymbol])

  // The quoted CCIP fee row, shown before signing (R8).
  const feeRows: ReviewRow[] =
    isBase && feeQuery.data !== undefined
      ? [
          {
            label: 'Bridge fee',
            value: `${formatNumber(Number(formatUnits(feeQuery.data, 18)), {
              maxFractionDigits: 6,
            })} HSK`,
          },
        ]
      : []

  // Block submit while the fee is loading or unavailable (R8, KTD8), on top of the
  // existing stale-price hard block.
  const feeBlock =
    isBase && amountTokens > 0
      ? feeQuery.isLoading
        ? 'Quoting cross-chain fee…'
        : feeQuery.isError
          ? 'Cross-chain fee unavailable right now'
          : undefined
      : undefined
  const blockReason = staleBlockReason(market) ?? feeBlock

  const onSubmit = (amt: number) => {
    const amount = parseUnits(amt.toString(), market.borrowDecimals)
    if (!isBase) {
      void same.borrow(amount)
      return
    }
    // Defer the tracker until the tx confirms (the effect starts it on 'bridging').
    setPending(amt.toString())
    void cross.borrow(amount)
  }

  if (transfer) {
    return (
      <div className="flex flex-col gap-3">
        <CrossChainTracker transfer={transfer} />
        {transfer.step === 'arrived' ? (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl px-4 py-2 text-sm font-bold"
            style={{ background: 'var(--palm)', color: '#f3faf5' }}
          >
            Done
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <ActionPanel
        title={`Borrow ${market.borrowSymbol}`}
        idleLabel="Borrow"
        symbol={market.borrowSymbol}
        tokenAddress={market.borrowAddress}
        decimals={market.borrowDecimals}
        priceUsd={1}
        balance={wallet}
        maxTokens={1000}
        preflight={positiveAmount}
        blockReason={blockReason}
        reviewApy={market.borrowApr}
        networkFeeHsk={NETWORK_FEE_HSK}
        extraReviewRows={feeRows}
        onAmountChange={setAmountTokens}
        headerRight={
          <ChainSelectButton
            destination={destination}
            onClick={() => setPickerOpen(true)}
          />
        }
        txState={active.state}
        revert={active.revert ?? undefined}
        belowSlider={belowSlider}
        onSubmit={onSubmit}
      />
      <ChainSelectDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={destination}
        onSelect={setDestination}
        baseEnabled={baseEnabled}
      />
    </>
  )
}

import { useState } from 'react'
import { parseUnits } from 'viem'
import { MoneyInput } from '#/components/ui/MoneyInput'
import { ActionButton } from '#/components/ui/ActionButton'
import { NetworkBanner } from '#/components/ui/wallet/NetworkBanner'
import { CrossChainTracker } from '#/components/ui/CrossChainTracker'
import type { MarketView } from '#/features/markets/types'
import { useCrossChainTransfer } from '../useCrossChainTransfer'
import { useCrossChainSupply } from '../hooks/useCrossChainSupply'

/**
 * Cross-chain supply from Base (U17, R26, R27). The real write runs through
 * useCrossChainSupply (Base guard → quote → approve → supplyToHashKey); the
 * tracker shows the two-hop until delivery completes on HashKey. Mock-first.
 */
export function CrossChainSupplyPanel({
  market,
  onBase = true,
}: {
  market: MarketView
  onBase?: boolean
}) {
  const [value, setValue] = useState('')
  const { state, supply } = useCrossChainSupply(market)
  const { transfer, start, update, clear } = useCrossChainTransfer()

  const submit = async () => {
    start({
      id: 'xfer',
      sourceChain: 'Base',
      destChain: 'HashKey',
      amount: value || '0',
      symbol: market.collateralSymbol,
      step: 'sent',
      startedAt: Date.now(),
      etaSeconds: 300,
      sourceTxUrl: '#',
    })
    window.setTimeout(() => update({ step: 'relaying' }), 400)
    // Resolves once the destination InboundSupply is observed (delivered).
    await supply(parseUnits(value || '0', market.collateralDecimals))
    update({ step: 'arrived', destTxUrl: '#' })
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
    <div className="island-shell flex flex-col gap-3 rounded-2xl p-4">
      <h3 className="display-title m-0 text-base font-semibold">
        Supply from Base
      </h3>
      {!onBase ? (
        <NetworkBanner currentChainName="HashKey" targetName="Base" />
      ) : null}
      <MoneyInput
        symbol={market.collateralSymbol}
        decimals={market.collateralDecimals}
        value={value}
        onChange={setValue}
      />
      <ActionButton
        state={state}
        idleLabel="Supply to HashKey"
        disabled={value === ''}
        onClick={() => void submit()}
      />
    </div>
  )
}

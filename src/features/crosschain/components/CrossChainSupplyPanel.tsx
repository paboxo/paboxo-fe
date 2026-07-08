import { useState } from 'react'
import { MoneyInput } from '#/components/ui/MoneyInput'
import { ActionButton } from '#/components/ui/ActionButton'
import { NetworkBanner } from '#/components/ui/wallet/NetworkBanner'
import { CrossChainTracker } from '#/components/ui/CrossChainTracker'
import { useCrossChainTransfer } from '../useCrossChainTransfer'

/** Cross-chain supply from Base (U14, R25). Built mock-first; tracker takes over post-send. */
export function CrossChainSupplyPanel({ onBase = true }: { onBase?: boolean }) {
  const [value, setValue] = useState('')
  const { transfer, start, update, clear } = useCrossChainTransfer()

  const submit = () => {
    start({
      id: 'demo',
      sourceChain: 'Base',
      destChain: 'HashKey',
      amount: value || '0',
      symbol: 'pxUSDT',
      step: 'sent',
      startedAt: Date.now(),
      etaSeconds: 300,
      sourceTxUrl: '#',
    })
    window.setTimeout(() => update({ step: 'relaying' }), 600)
    window.setTimeout(() => update({ step: 'arrived', destTxUrl: '#' }), 1800)
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
        symbol="pxUSDT"
        decimals={6}
        value={value}
        onChange={setValue}
      />
      <ActionButton
        state="idle"
        idleLabel="Supply to HashKey"
        disabled={!onBase || value === ''}
        onClick={submit}
      />
    </div>
  )
}

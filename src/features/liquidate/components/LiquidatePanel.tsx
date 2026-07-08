import { useState } from 'react'
import { formatUsd } from '#/lib/format'
import { HealthMeter } from '#/components/ui/HealthMeter'
import { ActionButton } from '#/components/ui/ActionButton'
import { truncateAddress } from '#/components/ui/wallet/AccountPill'
import type { Address } from '#/lib/contracts'
import type { MarketView } from '#/features/markets/types'
import { useLiquidate } from '../hooks/useLiquidate'

export interface LiquidationTarget {
  borrower: string
  healthFactor: number
  debtUsd: number
  bonusPct: number
}

/**
 * Liquidate an unhealthy position (U13, R22, R30). Guided framing + a deliberate
 * acknowledgement; the hook's pre-flight is the real gate (a healthy borrower is
 * never actionable), and the over-approval is reset after a successful seize.
 */
export function LiquidatePanel({
  market,
  target,
}: {
  market: MarketView
  target: LiquidationTarget
}) {
  const [confirmed, setConfirmed] = useState(false)
  const { state, liquidate } = useLiquidate(market)
  const liquidatable = target.healthFactor < 1
  const receiveUsd = target.debtUsd * (1 + target.bonusPct / 100)

  return (
    <div className="island-shell flex flex-col gap-3 rounded-2xl p-4">
      <h3 className="display-title m-0 text-base font-semibold">
        Liquidate position
      </h3>
      <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
        You repay an unhealthy borrower’s debt and receive their collateral plus
        a bonus.
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--sea-ink-soft)]">Borrower</span>
        <span className="num">{truncateAddress(target.borrower)}</span>
      </div>
      <HealthMeter hf={target.healthFactor} />

      <div
        className="flex flex-col gap-1 rounded-xl p-3 text-[0.82rem]"
        style={{
          background: 'color-mix(in oklab, var(--sand) 40%, transparent)',
        }}
      >
        <div className="flex justify-between">
          <span className="text-[var(--sea-ink-soft)]">Repay debt</span>
          <span className="num">{formatUsd(target.debtUsd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--sea-ink-soft)]">You receive</span>
          <span className="num font-semibold" style={{ color: 'var(--palm)' }}>
            {formatUsd(receiveUsd)} (+{target.bonusPct}%)
          </span>
        </div>
      </div>

      {liquidatable ? (
        <>
          <label className="flex items-start gap-2 text-[0.8rem] text-[var(--sea-ink)]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I understand I’m repaying this debt to seize the collateral.
          </label>
          <ActionButton
            state={state}
            idleLabel="Liquidate"
            disabled={!confirmed}
            onClick={() => void liquidate(target.borrower as Address)}
          />
        </>
      ) : (
        <p
          className="m-0 text-sm font-semibold"
          style={{ color: 'var(--safe)' }}
        >
          This position is healthy and can’t be liquidated.
        </p>
      )}
    </div>
  )
}

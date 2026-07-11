import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { MoneyInput } from '#/components/ui/MoneyInput'
import { NetworkBadge } from '#/components/ui/NetworkBadge'
import type { Denomination } from '#/components/ui/MoneyInput'
import { ProjectedHealth } from '#/components/ui/ProjectedHealth'
import { LiquidationPrice } from '#/components/ui/LiquidationPrice'
import { ActionButton } from '#/components/ui/ActionButton'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { TxStatus, TxStepper } from '#/components/ui/TxStatus'
import type { TxStep } from '#/components/ui/TxStatus'
import type { Address } from '#/lib/contracts'
import type { TxState } from '#/lib/tx/txState'
import type { NormalizedRevert } from '#/lib/tx/revertReason'
import { ReviewBlock } from './ReviewBlock'
import type { ReviewRow } from './ReviewBlock'

export interface PreflightResult {
  enabled: boolean
  reason?: string
}

export interface ActionPanelProps {
  title: string
  idleLabel: string
  symbol: string
  /** When set and known to the registry, the token logo renders in the header. */
  tokenAddress?: Address
  decimals: number
  priceUsd?: number
  balance?: bigint
  /** Basis for MAX and quick-fill (gas-reserved / risk-bounded, computed by the caller). */
  maxTokens?: number
  maxLabel?: string
  currentHf?: number
  projectHf?: (amountTokens: number) => number
  /** Injected revert-condition gate; blocks before the wallet opens (R18). */
  preflight?: (amountTokens: number) => PreflightResult
  /**
   * An amount-independent hard block, e.g. a stale price feed (R10). When set the
   * button is disabled regardless of what is typed and the string is surfaced as a
   * sibling caption the button references via `aria-describedby` — a native
   * `disabled` button takes no hover or focus, so a keyboard or screen-reader user
   * would never receive a tooltip. Each panel instance gets its own reason id, so
   * many disabled buttons never point at one another's reason.
   */
  blockReason?: string
  reviewApy?: number
  networkFeeUsd?: number
  liquidation?: {
    asset: string
    currentPrice: number
    liquidationPrice: number
  }
  steps?: TxStep[]
  activeStep?: number
  txState?: TxState
  revert?: NormalizedRevert
  /** Extra content rendered inside the card, below the slider (e.g. the borrow
   *  "Your position" block). Sits above the network line and the review. */
  belowSlider?: ReactNode
  onSubmit: (amountTokens: number) => void
}

const AT_RISK_ACK_FLOOR = 1.25

/**
 * The shared action panel (U10, R12/R14/R16/R18/R21). Composes money input,
 * live projected health, the review block, and the tx button; a failing
 * pre-flight gate disables submit before any signature, and an at-risk
 * projection requires an explicit acknowledgement.
 */
export function ActionPanel(props: ActionPanelProps) {
  const {
    title,
    idleLabel,
    symbol,
    tokenAddress,
    decimals,
    priceUsd,
    balance,
    maxTokens,
    maxLabel,
    currentHf,
    projectHf,
    preflight,
    blockReason,
    reviewApy,
    networkFeeUsd,
    liquidation,
    steps,
    activeStep = 0,
    txState = 'idle',
    revert,
    belowSlider,
    onSubmit,
  } = props

  const [value, setValue] = useState('')
  const [denomination, setDenomination] = useState<Denomination>('token')
  const [acknowledged, setAcknowledged] = useState(false)
  // Row-unique id for the hard-block reason — stable across this instance's
  // lifetime, so a stale→fresh refetch toggles the reason without remounting.
  const reasonId = useId()

  const typed = value === '' ? 0 : Number(value)
  const amountTokens =
    denomination === 'token' ? typed : priceUsd ? typed / priceUsd : 0
  const validAmount = Number.isFinite(amountTokens) && amountTokens > 0

  const projectedHf =
    projectHf && validAmount ? projectHf(amountTokens) : undefined
  const requiresAck =
    projectedHf !== undefined && projectedHf < AT_RISK_ACK_FLOOR
  const gate: PreflightResult =
    preflight && validAmount ? preflight(amountTokens) : { enabled: true }
  const hardBlocked = blockReason !== undefined && blockReason !== ''
  const blocked =
    !validAmount ||
    !gate.enabled ||
    (requiresAck && !acknowledged) ||
    hardBlocked

  const fillWith = (tokens: number) => {
    setDenomination('token')
    setValue(String(tokens))
  }

  const reviewRows: ReviewRow[] = [
    { label: `${idleLabel} amount`, value: `${value} ${symbol}` },
    ...(projectedHf !== undefined
      ? [{ label: 'New health', value: projectedHf.toFixed(2) }]
      : []),
    ...(reviewApy !== undefined
      ? [{ label: 'APY', value: `${reviewApy.toFixed(2)}%` }]
      : []),
    ...(networkFeeUsd !== undefined
      ? [{ label: 'Network fee', value: `$${networkFeeUsd.toFixed(2)}` }]
      : []),
  ]

  return (
    <div className="island-shell flex flex-col gap-3 rounded-2xl p-4">
      <h3 className="display-title m-0 flex items-center gap-2 text-base font-semibold">
        <TokenGlyph symbol={symbol} address={tokenAddress} size={22} />
        {title}
      </h3>

      <MoneyInput
        symbol={symbol}
        decimals={decimals}
        value={value}
        onChange={setValue}
        balance={balance}
        priceUsd={priceUsd}
        denomination={denomination}
        maxTokens={maxTokens}
        onQuickFill={
          maxTokens ? (fraction) => fillWith(maxTokens * fraction) : undefined
        }
        onMax={maxTokens ? () => fillWith(maxTokens) : undefined}
        maxLabel={maxLabel}
        error={gate.enabled ? undefined : gate.reason}
      />

      {/* Optional block below the slider (e.g. the borrow "Your position"). */}
      {belowSlider}

      {/* Network moved below the slider (mockup). */}
      <NetworkBadge />

      {currentHf !== undefined && projectedHf !== undefined ? (
        <ProjectedHealth currentHf={currentHf} projectedHf={projectedHf} />
      ) : null}

      {liquidation && validAmount ? (
        <LiquidationPrice {...liquidation} />
      ) : null}

      {validAmount ? <ReviewBlock rows={reviewRows} /> : null}

      {requiresAck ? (
        <label className="flex items-start gap-2 text-[0.78rem] text-[var(--sea-ink)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          I understand this position can be liquidated if prices move against
          me.
        </label>
      ) : null}

      {steps && steps.length > 1 ? (
        <TxStepper steps={steps} activeIndex={activeStep} />
      ) : null}

      <ActionButton
        state={txState}
        idleLabel={idleLabel}
        disabled={blocked}
        onClick={() => onSubmit(amountTokens)}
        aria-describedby={hardBlocked ? reasonId : undefined}
      />

      {hardBlocked ? (
        <p
          id={reasonId}
          role="status"
          className="m-0 text-[0.78rem]"
          style={{ color: 'var(--caution)' }}
        >
          {blockReason}
        </p>
      ) : null}

      <TxStatus state={txState} revert={revert} />
    </div>
  )
}

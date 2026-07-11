import { useId } from 'react'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { formatTokenAmount } from '#/lib/format'
import { ActionButton } from '#/components/ui/ActionButton'
import { TxStatus } from '#/components/ui/TxStatus'
import { PROTECTION, PROTECTION_UNCONFIGURED } from '#/lib/contracts'
import { getTokenByAddress } from '#/lib/tokens/registry'
import type { MarketView } from '#/features/markets/types'
import { useProtection, useProtectionStatus } from '../hooks/useProtection'
import type { ProtectionPhase } from '../hooks/useProtection'

const PHASE_LABEL: Record<Exclude<ProtectionPhase, 'idle'>, string> = {
  paying: 'Paying fee…',
  verifying: 'Verifying receipt…',
  activating: 'Activating protection…',
}

/**
 * AI "agent protection" surface (HSP-gated). Enabling pays a small stablecoin
 * fee through HSP; on ACCEPT the user grants the AI keeper rebalance-only
 * delegation and the panel reflects the protected state. Mirrors
 * `DelegationPanel` — same island shell + shared `ActionButton`/`TxStatus`.
 */
export function ProtectionPanel({ market }: { market: MarketView }) {
  const {
    state,
    revert,
    isPending,
    phase,
    decision,
    explorerHref,
    error,
    enableProtection,
    disableProtection,
  } = useProtection(market)
  const { active } = useProtectionStatus(market)
  const reasonId = useId()

  const feeToken = getTokenByAddress(PROTECTION.feeToken)
  const feeLabel = `${formatTokenAmount(
    PROTECTION.feeAmount,
    feeToken?.decimals ?? 6,
  )} ${feeToken?.label ?? 'USDC.e'}`

  const unconfigured = PROTECTION_UNCONFIGURED(PROTECTION)
  const running = phase !== 'idle'
  const accepted = decision?.outcomeClass === 'ACCEPT'
  const phaseLabel = phase === 'idle' ? null : PHASE_LABEL[phase]

  return (
    <section className="island-shell flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="display-title m-0 flex items-center gap-2 text-base font-semibold">
          <ShieldCheck size={20} aria-hidden="true" />
          Agent protection
        </h3>
      </div>

      <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
        Pay a small fee to let the Paboxo AI keeper rebalance and protect this
        position automatically. On approval you grant the keeper rebalance-only
        permission — it can never withdraw or borrow, and your funds stay in the
        pool.
      </p>

      {active ? (
        <div className="flex items-center justify-between gap-2">
          <p
            className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: 'var(--palm)' }}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Protected by AI agent
          </p>
          <button
            type="button"
            onClick={() => void disableProtection()}
            disabled={isPending}
            className="rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-2.5 py-1 text-[0.78rem] font-bold text-[var(--sea-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Disable
          </button>
        </div>
      ) : (
        <>
          <ActionButton
            state={state}
            idleLabel={`Enable protection (pay fee) · ${feeLabel}`}
            disabled={unconfigured || running}
            onClick={() => void enableProtection()}
            aria-describedby={unconfigured ? reasonId : undefined}
          />
          {phaseLabel ? (
            <p
              role="status"
              className="m-0 text-[0.8rem] text-[var(--sea-ink-soft)]"
            >
              {phaseLabel}
            </p>
          ) : null}
        </>
      )}

      {accepted ? (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[0.72rem] font-bold"
            style={{ background: 'var(--palm)', color: '#f3faf5' }}
          >
            ACCEPT
          </span>
          {explorerHref ? (
            <a
              href={explorerHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-[var(--sea-ink)] underline"
            >
              View receipt on HSP Explorer
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="m-0 text-[0.8rem] font-semibold"
          style={{ color: 'var(--danger)' }}
        >
          {error}
        </p>
      ) : null}

      <TxStatus state={state} revert={revert ?? undefined} />

      <p
        id={reasonId}
        className="m-0 text-[0.72rem] text-[var(--sea-ink-soft)]"
      >
        {unconfigured
          ? 'Set PROTECTION.agentKeeper / feeTreasury in addresses.ts'
          : 'Fee settles via HSP (testnet sandbox).'}
      </p>
    </section>
  )
}

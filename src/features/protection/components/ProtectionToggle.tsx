import { useAgentProtection } from '../hooks/useAgentProtection'
import { ShieldIcon } from '#/components/icons/ShieldIcon'
import type { MarketView } from '#/features/markets/types'

/**
 * Per-pool free protection switch (R7, R9, AE3). Binds one pool's
 * `useAgentProtection` to an accessible switch: on grants the AI keeper
 * rebalance-delegation, off revokes it — no payment. Disabled while a write is
 * in flight, the status is still loading, or the keeper is unconfigured.
 */
export function ProtectionToggle({ market }: { market: MarketView }) {
  const { active, enable, disable, isPending, isStatusLoading, unconfigured } =
    useAgentProtection(market)

  const toggle = () => {
    void (active ? disable() : enable())
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--sea-ink)]">
          <ShieldIcon size={15} />
          Agent protection
        </span>
        <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
          {active
            ? 'On — the agent can rebalance this pool to defend your HF.'
            : 'Off — turn on free protection for this pool.'}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={`Agent protection for ${market.collateralSymbol} / ${market.borrowSymbol}`}
        disabled={isPending || isStatusLoading || unconfigured}
        onClick={toggle}
        className="inline-flex min-w-[4.5rem] items-center justify-center rounded-full px-3 py-1.5 text-[0.78rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: active ? 'var(--safe-soft)' : 'var(--surface-strong)',
          color: active ? 'var(--safe)' : 'var(--sea-ink-soft)',
          border: '1px solid var(--line)',
        }}
      >
        {isPending ? 'Saving…' : active ? 'On' : 'Off'}
      </button>
    </div>
  )
}

import { HASHKEY, TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { formatTokenAmount } from '#/lib/format'
import { HealthFactorBadge } from '#/components/ui/HealthFactorBadge'
import { ShieldIcon } from '#/components/icons/ShieldIcon'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { useAgentActivity } from '../hooks/useAgentActivity'
import type { AgentAction, AgentOutcome } from '../agent/types'

/** How each outcome reads. `dry-run` is a SIMULATION, never a failure. */
const OUTCOME_LABEL: Record<AgentOutcome, string> = {
  sent: 'Protected',
  'dry-run': 'Simulation',
  skipped: 'Skipped',
  'signal-only': 'Signal',
  failed: 'Failed',
}

const OUTCOME_TONE: Record<AgentOutcome, string> = {
  sent: 'var(--safe)',
  'dry-run': 'var(--sea-ink-soft)',
  skipped: 'var(--sea-ink-soft)',
  'signal-only': 'var(--sea-ink-soft)',
  failed: 'var(--danger)',
}

function tokenDecimals(symbol: string): number {
  const entry = (TOKENS as Record<string, { decimals: number } | undefined>)[
    symbol
  ]
  return entry?.decimals ?? 18
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ActionCard({ action }: { action: AgentAction }) {
  const amount = BigInt(action.amountIn)
  return (
    <li className="flex flex-col gap-2 border-b border-[var(--line)] py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 text-[0.78rem] font-bold"
          style={{ color: OUTCOME_TONE[action.outcome] }}
        >
          {action.outcome === 'sent' ? <ShieldIcon size={13} /> : null}
          {OUTCOME_LABEL[action.outcome]}
        </span>
        <HealthFactorBadge hf={action.hf} />
      </div>

      <p className="m-0 text-[0.88rem] text-[var(--sea-ink)]">
        {action.llmMessage}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-[var(--sea-ink-soft)]">
        {amount > 0n ? (
          <span className="num">
            {formatTokenAmount(amount, tokenDecimals(action.token))}{' '}
            {action.token}
          </span>
        ) : null}
        <time dateTime={new Date(action.ts).toISOString()}>
          {formatWhen(action.ts)}
        </time>
        {action.outcome === 'sent' && action.txHash ? (
          <a
            href={`${HASHKEY.explorerUrl}/tx/${action.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
            style={{ color: 'var(--palm)' }}
          >
            View transaction
          </a>
        ) : null}
      </div>
    </li>
  )
}

/**
 * The rebalance agent's recent actions with its LLM reasoning (R10, R11).
 * Preview-badged (mock source): each row leads with the "why", carries the HF
 * zone at the time, a token-formatted rotated amount, a timestamp, and an
 * explorer link when the action was actually sent.
 */
export function AgentActivityFeed({ user }: { user?: Address }) {
  const { data, isLoading, error } = useAgentActivity(user)

  return (
    <section
      className="island-shell flex flex-col gap-2 rounded-2xl p-5"
      aria-label="Agent activity"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="display-title m-0 text-base font-semibold">
          Agent activity
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.06em]"
          style={{
            color: 'var(--sea-ink-soft)',
            background: 'var(--surface-strong)',
            border: '1px solid var(--line)',
          }}
        >
          Preview
        </span>
      </div>

      {isLoading ? (
        <LoadingCard rows={3} />
      ) : error ? (
        <ErrorState message="Agent activity is temporarily unavailable." />
      ) : data.length === 0 ? (
        <EmptyState
          title="No agent activity yet"
          description="Once protection is on, the agent's actions and reasoning appear here."
        />
      ) : (
        <ul className="m-0 flex flex-col p-0">
          {data.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </ul>
      )}
    </section>
  )
}

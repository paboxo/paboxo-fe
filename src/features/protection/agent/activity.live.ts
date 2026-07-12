/**
 * Live agent-activity source (R10, R11): the backend REST read
 * `GET <base>/api/actions?user=<addr>&limit=<n>`. `base` is `VITE_AGENT_API_URL`
 * — a same-origin proxy path (e.g. `/agent-api`), so the real upstream host and
 * any auth stay server-side. Selected by the registry in `activity.ts`.
 *
 * Non-critical surface — any fault (network, non-OK, malformed body) DEGRADES to
 * an empty list rather than throwing, so the feed shows its empty state, never a
 * dead-end error. Rows are mapped defensively to `AgentAction`; confirm the field
 * names against the deployed API once real actions exist (the endpoint returns
 * `[]` until the agent acts on a protected position).
 */
import { getTokenByAddress } from '#/lib/tokens/registry'
import type { Address } from '#/lib/contracts'
import type { AgentAction, AgentLever, AgentOutcome } from './types'

const LEVERS: readonly AgentLever[] = ['rotate', 'deleverage', 'signal-only']
const OUTCOMES: readonly AgentOutcome[] = [
  'sent',
  'dry-run',
  'skipped',
  'signal-only',
  'failed',
]

function asLever(value: unknown): AgentLever {
  return LEVERS.includes(value as AgentLever)
    ? (value as AgentLever)
    : 'signal-only'
}

function asOutcome(value: unknown): AgentOutcome {
  return OUTCOMES.includes(value as AgentOutcome)
    ? (value as AgentOutcome)
    : 'skipped'
}

/** A token field may arrive as a display symbol or a 0x address — normalise it. */
function tokenSymbol(value: unknown): string {
  const raw = typeof value === 'string' ? value : ''
  if (raw.startsWith('0x') && raw.length === 42) {
    return getTokenByAddress(raw as Address)?.label ?? raw
  }
  return raw
}

/** The backend `Action` row, read tolerantly (field presence is not assumed). */
interface RawAction {
  id?: string | number
  llmMessage?: string
  hf?: number | string
  lever?: string
  outcome?: string
  amountIn?: string | number
  token?: string
  txHash?: string | null
  ts?: number | string
}

function toAgentAction(raw: RawAction): AgentAction {
  const txHash = raw.txHash ?? undefined
  return {
    id: String(raw.id ?? ''),
    llmMessage: raw.llmMessage ?? '',
    hf: Number(raw.hf ?? 0),
    lever: asLever(raw.lever),
    outcome: asOutcome(raw.outcome),
    amountIn: String(raw.amountIn ?? '0'),
    token: tokenSymbol(raw.token),
    ...(txHash ? { txHash } : {}),
    ts: Number(raw.ts ?? 0),
  }
}

export async function getLiveAgentActions(
  base: string,
  user?: Address,
  limit = 20,
): Promise<AgentAction[]> {
  if (!user) return []
  const url = `${base.replace(/\/$/, '')}/api/actions?user=${user}&limit=${limit}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const body: unknown = await res.json()
    if (!Array.isArray(body)) return []
    return body.map((row) => toAgentAction(row as RawAction))
  } catch {
    return []
  }
}

/**
 * Mock agent-activity source (R10, R11). Preview-grade fixture used when no
 * agent REST base is configured (`VITE_AGENT_API_URL`). The registry in
 * `activity.ts` picks this or the live fetcher — the hook/components never see
 * the difference.
 */
import type { Address } from '#/lib/contracts'
import type { AgentAction } from './types'

const HASH = `0x${'ab'.repeat(32)}`

/** Newest first. Covers a real rotation, a dry-run simulation, and a signal. */
export const AGENT_ACTIONS_FIXTURE: AgentAction[] = [
  {
    id: 'act-1',
    llmMessage:
      'HF dipped to 1.08 as pxWHSK fell ~6%. Rotated 500 pxWHSK → pxUSDT to lift HF back to 1.31, all inside your position.',
    hf: 1.08,
    lever: 'rotate',
    outcome: 'sent',
    amountIn: (500n * 10n ** 18n).toString(),
    token: 'pxWHSK',
    txHash: HASH,
    ts: 1_720_500_000_000,
  },
  {
    id: 'act-2',
    llmMessage:
      'HF at 1.19, inside the watch band. Simulated a 220 pxWHSK rotation to preview recovery to 1.30 — no transaction sent.',
    hf: 1.19,
    lever: 'rotate',
    outcome: 'dry-run',
    amountIn: (220n * 10n ** 18n).toString(),
    token: 'pxWHSK',
    ts: 1_720_400_000_000,
  },
  {
    id: 'act-3',
    llmMessage:
      'HF healthy at 1.42 — no action needed. The agent keeps monitoring the position.',
    hf: 1.42,
    lever: 'signal-only',
    outcome: 'signal-only',
    amountIn: '0',
    token: 'pxWHSK',
    ts: 1_720_300_000_000,
  },
]

/** Preview fixture source, selected by the registry when no REST base is set. */
export function getMockAgentActions(_user?: Address): Promise<AgentAction[]> {
  return Promise.resolve(AGENT_ACTIONS_FIXTURE)
}

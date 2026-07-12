/**
 * Rebalance-agent activity model (R10, R11). Mirrors the backend `Action` DTO
 * (`docs/AI-REBALANCE-BACKEND.md`): the LLM writes `llmMessage` (the "why"); the
 * numbers are deterministic on-chain math. `outcome = dry-run` is a preview
 * SIMULATION, not a failure.
 */

/** What the agent did to defend the position. */
export type AgentLever = 'rotate' | 'deleverage' | 'signal-only'

/** How the action resolved. `dry-run` = simulated (test env), never "failed". */
export type AgentOutcome =
  'sent' | 'dry-run' | 'skipped' | 'signal-only' | 'failed'

export interface AgentAction {
  id: string
  /** The LLM's plain-language reasoning — the most important field for the UI. */
  llmMessage: string
  /** Health Factor at the time the agent acted. */
  hf: number
  lever: AgentLever
  outcome: AgentOutcome
  /** Rotated amount, string bigint in the collateral token's decimals. */
  amountIn: string
  /** Collateral token symbol, used for the amount format + decimals. */
  token: string
  /** Explorer tx hash — present only when `outcome === 'sent'`. */
  txHash?: string
  /** Timestamp, ms (for ordering + display). */
  ts: number
}

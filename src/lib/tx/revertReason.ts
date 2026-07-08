/**
 * Humane revert reasons (U5, R15). Decodes a viem-shaped error (name +
 * shortMessage + cause chain) to plain language; the raw error is kept for a
 * Details disclosure. Wallet rejection is detected separately — it is not a
 * failure, so it never reaches this mapping.
 */

const REVERT_REASONS: Record<string, string> = {
  HealthFactorTooLow:
    'This would put your position at risk of liquidation. Try a smaller amount.',
  InsufficientLiquidity:
    'The pool doesn’t have enough liquidity for this amount right now.',
  InsufficientCollateral:
    'You need more collateral before borrowing this much.',
  StalePrice: 'The price feed is out of date. Try again once it refreshes.',
  PriceStale: 'The price feed is out of date. Try again once it refreshes.',
  InsufficientAllowance:
    'Token approval is missing or too small — approve the exact amount and retry.',
  SlippageExceeded:
    'The price moved beyond your slippage tolerance. Raise it slightly or retry.',
  ZeroAmount: 'Enter an amount greater than zero.',
  NotLiquidatable: 'This position is healthy and cannot be liquidated.',
}

export interface NormalizedRevert {
  message: string
  raw?: string
}

interface ErrorLike {
  name?: unknown
  shortMessage?: unknown
  message?: unknown
  cause?: unknown
}

function names(error: unknown): string[] {
  const collected: string[] = []
  let current: unknown = error
  let guard = 0
  while (current && typeof current === 'object' && guard < 12) {
    const e = current as ErrorLike
    if (typeof e.name === 'string') collected.push(e.name)
    current = e.cause
    guard += 1
  }
  return collected
}

function topShortMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    const e = error as ErrorLike
    if (typeof e.shortMessage === 'string') return e.shortMessage
    if (typeof e.message === 'string') return e.message
  }
  return undefined
}

export function normalizeRevertReason(error: unknown): NormalizedRevert {
  const raw = topShortMessage(error)
  for (const name of names(error)) {
    const mapped = REVERT_REASONS[name]
    if (mapped) return { message: mapped, raw }
  }
  return {
    message:
      'The transaction failed on-chain. See details for the exact error.',
    raw,
  }
}

const REJECTION_NAMES = new Set([
  'UserRejectedRequestError',
  'UserRejected',
  'TransactionRejectedRpcError',
])

export function isUserRejection(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as ErrorLike & { code?: unknown }
    if (e.code === 4001) return true
  }
  return names(error).some((name) => REJECTION_NAMES.has(name))
}

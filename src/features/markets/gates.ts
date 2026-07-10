/**
 * The two gates every write panel shares.
 *
 * They lived inline in five panels, each rebuilding the same rule — one of them
 * via a `PreflightResult` that existed only to be immediately negated back into
 * a string. Naming them once means a change to either rule reaches every panel.
 */
import type { PreflightResult } from '#/components/action/ActionPanel'
import type { MarketView } from './types'
import { STALE_PRICE_REASON } from './components/PoolBadges'

/**
 * Amount-independent block: a pool whose collateral price is unreadable cannot
 * be transacted against. `undefined` means "not blocked" — `ActionPanel` treats
 * a string as a hard block and links it to the button via `aria-describedby`.
 *
 * Note the Withdraw tab deliberately does NOT use this: withdrawing removes
 * exposure and consults no oracle, so blocking it would trap a lender's funds.
 */
export function staleBlockReason(market: MarketView): string | undefined {
  return market.priceStale ? STALE_PRICE_REASON : undefined
}

/** The amount gate every panel shares: nothing to do with zero. */
export function positiveAmount(amountTokens: number): PreflightResult {
  return amountTokens > 0
    ? { enabled: true }
    : { enabled: false, reason: 'Enter an amount greater than zero.' }
}

import type { QueryKey } from '@tanstack/react-query'

/**
 * Query keys every write invalidates on success. These are broad prefixes:
 * TanStack fuzzy-matches from the key head, so `['token-balances']` matches
 * `['token-balances', address]` and `['market-position']` matches
 * `['market-position', id, address]`.
 *
 * A supply/borrow/repay/withdraw shifts more than the market and position:
 * the wallet's token balances change, per-market position reads change, and any
 * spent allowance changes. `['position']` does NOT prefix-match
 * `['market-position', ...]`, and none of the market keys match the wallet
 * balance keys — so both are listed explicitly here. Missing them is why a
 * confirmed tx left the header balance stale and the borrow gate reading old
 * collateral.
 */
export const WRITE_INVALIDATE_KEYS: QueryKey[] = [
  ['markets'],
  ['position'],
  ['market-position'],
  ['protocol-stats'],
  ['token-balances'],
  ['token-balance'],
  ['allowances'],
]

import type { QueryKey } from '@tanstack/react-query'

/**
 * Query keys every write invalidates on success. These are broad prefixes:
 * TanStack fuzzy-matches from the key head, so `['token-balances']` matches
 * `['token-balances', address]` and `['market-position']` matches
 * `['market-position', id, address]`.
 *
 * A supply/borrow/repay/withdraw/swap shifts more than the market and position:
 * the wallet's token balances change, per-market position reads change, and any
 * spent allowance changes. Prefix-matching is per-element from the head, so a
 * distinct head string is a distinct key: `['position']` does NOT match
 * `['market-position', ...]`, `['position-balances', ...]`,
 * `['position-address', ...]`, or `['position-token-balance', ...]` — each head
 * must be listed explicitly. Missing the `position-balances` head is why a
 * confirmed swap left the swap panel's collateral balances stale; missing
 * `market-position` left the header balance and borrow gate stale.
 */
export const WRITE_INVALIDATE_KEYS: QueryKey[] = [
  ['markets'],
  ['position'],
  ['market-position'],
  ['position-balances'],
  ['position-address'],
  ['position-token-balance'],
  ['protocol-stats'],
  ['token-balances'],
  ['token-balance'],
  ['allowances'],
]

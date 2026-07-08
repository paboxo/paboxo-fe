import type { QueryKey } from '@tanstack/react-query'

/** Query keys every write invalidates on success — markets, the user's position,
 *  and protocol stats all shift after a supply/borrow/repay/withdraw. */
export const WRITE_INVALIDATE_KEYS: QueryKey[] = [
  ['markets'],
  ['position'],
  ['protocol-stats'],
]

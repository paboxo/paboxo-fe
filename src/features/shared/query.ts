/** The minimal query shape UI components consume from the feature hooks —
 *  a subset of TanStack Query's result, so a hook can back it with `useQuery`
 *  over the data adapters (mock now, live later) without changing call sites. */
export interface QueryResult<T> {
  data: T
  isLoading: boolean
  /** Widened so the error branch stays live — the real query can reject. */
  error: unknown
}

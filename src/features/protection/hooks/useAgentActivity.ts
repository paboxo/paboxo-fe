/**
 * The rebalance agent's recent actions for a user (R10, R11), sourced through
 * the `getAgentActions` seam — the live backend REST when `VITE_AGENT_API_URL`
 * is set, else the preview mock, with no component change. Ordered newest first.
 */
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import type { QueryResult } from '#/features/shared/query'
import { getAgentActions } from '../agent/activity'
import type { AgentAction } from '../agent/types'

export function useAgentActivity(user?: Address): QueryResult<AgentAction[]> {
  const query = useQuery({
    queryKey: ['agent-activity', user],
    queryFn: async () => {
      const actions = await getAgentActions(user)
      return [...actions].sort((a, b) => b.ts - a.ts)
    },
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Agent-activity seam (R10, R11). One swap point: `getAgentActions` reads from
 * the live backend REST when `VITE_AGENT_API_URL` is set (a same-origin proxy
 * path), otherwise serves the preview fixture. The hook and feed depend only on
 * this — flipping the env is the only change.
 */
import type { Address } from '#/lib/contracts'
import { AGENT_API_URL } from '#/lib/config/env'
import type { AgentAction } from './types'
import { getMockAgentActions } from './activity.mock'
import { getLiveAgentActions } from './activity.live'

export function getAgentActions(user?: Address): Promise<AgentAction[]> {
  return AGENT_API_URL
    ? getLiveAgentActions(AGENT_API_URL, user)
    : getMockAgentActions(user)
}

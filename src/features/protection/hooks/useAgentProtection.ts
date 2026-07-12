/**
 * Free agent-protection opt-in (R7, R9). A no-payment, per-pool toggle over the
 * rebalance-delegation calls: `enable()` grants the AI keeper delegation and
 * `disable()` revokes it, both through the one `useWriteAction` wrapper.
 *
 * Unlike `useProtection`, there is NO HSP `pay`/`verify` leg — portfolio
 * protection is free. The delegation only lets the keeper `rotate` within the
 * user's position (funds never leave it) and the user can revoke anytime.
 */
import { useCallback } from 'react'
import { PROTECTION, PROTECTION_UNCONFIGURED } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import type { MarketView } from '#/features/markets/types'
import { useProtectionStatus } from './useProtection'

export function useAgentProtection(market: MarketView) {
  const write = useWriteAction()
  const status = useProtectionStatus(market)
  const unconfigured = PROTECTION_UNCONFIGURED(PROTECTION)

  const setProtection = useCallback(
    (allowed: boolean): Promise<boolean> => {
      // Without a real keeper the delegation would target 0x0 — refuse loudly.
      if (unconfigured) return Promise.resolve(false)
      return write.run({
        send: () =>
          getAdapters().chain.approveRebalanceDelegation(
            market.poolAddress,
            PROTECTION.agentKeeper,
            allowed,
          ),
        invalidateKeys: [['protection', market.poolAddress]],
      })
    },
    [market.poolAddress, write, unconfigured],
  )

  const enable = useCallback(() => setProtection(true), [setProtection])
  const disable = useCallback(() => setProtection(false), [setProtection])

  return {
    ...write,
    active: status.active,
    isStatusLoading: status.isLoading,
    unconfigured,
    enable,
    disable,
  }
}

/**
 * AI "agent protection" (HSP-gated). Opting in pays a small stablecoin fee via
 * the HSP `PaymentGateway`; on an ACCEPT decision the FE grants rebalance-
 * delegation to the AI keeper (`PROTECTION.agentKeeper`), which may then
 * `rebalancePosition` to protect the position. Mirrors `useDelegation` — the
 * on-chain leg reuses the one `useWriteAction` wrapper — with the HSP legs
 * (`pay` → `awaitSettled` → `verify`) tracked as their own `phase` alongside the
 * tx-state machine.
 *
 * Default payment mode is `mock`, so the whole flow runs with no HSP creds; the
 * mock gateway settles instantly and always ACCEPTs (see `#/lib/payments`).
 */
import { useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { PROTECTION, PROTECTION_UNCONFIGURED } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { getPaymentGateway } from '#/lib/payments'
import type {
  ComplianceCap,
  Decision,
  PaymentReceipt,
} from '#/lib/payments'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import type { MarketView } from '#/features/markets/types'

/** The HSP legs, tracked separately from the on-chain tx state. */
export type ProtectionPhase = 'idle' | 'paying' | 'verifying' | 'activating'

/** Shown when the keeper/treasury placeholders in addresses.ts are still unset. */
const UNCONFIGURED_MESSAGE =
  'Set PROTECTION.agentKeeper / feeTreasury in addresses.ts'

function friendlyGatewayError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  return `Payment failed: ${detail}`
}

export function useProtection(market: MarketView) {
  const write = useWriteAction()
  const [phase, setPhase] = useState<ProtectionPhase>('idle')
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [explorerHref, setExplorerHref] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const enableProtection = useCallback(
    async (opts?: { compliance?: ComplianceCap[] }): Promise<boolean> => {
      // Guard: without a real keeper/treasury the delegation would target 0x0.
      if (PROTECTION_UNCONFIGURED(PROTECTION)) {
        setError(UNCONFIGURED_MESSAGE)
        return false
      }
      setError(null)

      const gateway = getPaymentGateway()

      // HSP legs: pay → settle → verify. A gateway fault is surfaced, not thrown.
      let settledDecision: Decision
      try {
        setPhase('paying')
        const handle = await gateway.pay({
          to: PROTECTION.feeTreasury,
          amount: PROTECTION.feeAmount,
          compliance: opts?.compliance,
        })
        const settled = await handle.awaitSettled()

        setPhase('verifying')
        settledDecision = await gateway.verify(settled.receipt)
        setReceipt(settled.receipt)
        setDecision(settledDecision)
        setExplorerHref(gateway.explorerUrl(handle.paymentId))
      } catch (err) {
        setPhase('idle')
        setError(friendlyGatewayError(err))
        return false
      }

      // Anything but ACCEPT stops here — the delegation is never granted.
      if (settledDecision.outcomeClass !== 'ACCEPT') {
        setPhase('idle')
        setError(settledDecision.reason ?? 'Payment was not accepted.')
        return false
      }

      // On-chain leg: grant rebalance-delegation to the keeper.
      setPhase('activating')
      const ok = await write.run({
        send: () =>
          getAdapters().chain.approveRebalanceDelegation(
            market.poolAddress,
            PROTECTION.agentKeeper,
            true,
          ),
        invalidateKeys: [['protection', market.poolAddress]],
      })
      setPhase('idle')
      return ok
    },
    [market.poolAddress, write],
  )

  const disableProtection = useCallback(
    () =>
      write.run({
        send: () =>
          getAdapters().chain.approveRebalanceDelegation(
            market.poolAddress,
            PROTECTION.agentKeeper,
            false,
          ),
        invalidateKeys: [['protection', market.poolAddress]],
      }),
    [market.poolAddress, write],
  )

  return {
    ...write,
    phase,
    receipt,
    decision,
    explorerHref,
    error,
    enableProtection,
    disableProtection,
  }
}

/** Whether the AI keeper currently holds rebalance-delegation from the user. */
export function useProtectionStatus(market: MarketView) {
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ['protection', market.poolAddress, address, PROTECTION.agentKeeper],
    enabled: Boolean(address) && !PROTECTION_UNCONFIGURED(PROTECTION),
    queryFn: () =>
      getAdapters().chain.getRebalanceDelegation(
        market.poolAddress,
        address!,
        PROTECTION.agentKeeper,
      ),
  })
  return { active: query.data ?? false, isLoading: query.isLoading }
}

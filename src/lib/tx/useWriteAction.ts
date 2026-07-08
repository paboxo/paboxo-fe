/**
 * The one write wrapper (U9, KTD8). Every write path — supply, borrow, repay,
 * withdraw, liquidate, create-pool, cross-chain — composes this: verify wallet
 * connected + on the required chain (prompt a switch), run the pre-flight gate,
 * ensure an exact-amount approval to the correct spender, drive the tx state
 * machine, and invalidate the affected queries on success. Wallet rejection is a
 * distinct, non-error outcome; on-chain reverts pass through normalizeRevertReason.
 *
 * Writes go through the chain adapter (mock now, @wagmi/core in U18), so this
 * wrapper is unchanged by the mock→live swap.
 */
import { useCallback, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { HASHKEY } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { Hash } from '#/lib/data'
import type { PreflightResult } from './preflight'
import { isUserRejection, normalizeRevertReason } from './revertReason'
import type { NormalizedRevert } from './revertReason'
import { ensureChain } from './chainGuard'
import type { TxState } from './txState'

/** An exact-amount ERC20 approval to a specific spender (LendingPool/Factory). */
export interface ApprovalSpec {
  token: Address
  spender: Address
  amount: bigint
}

export interface WriteActionInput {
  /** The pre-flight verdict from the caller's live reads; blocks when disabled. */
  preflight?: PreflightResult
  /** Ensure this approval before sending (skipped when allowance already covers it). */
  approval?: ApprovalSpec
  /** The adapter write; returns the tx hash. */
  send: () => Promise<Hash>
  /** Query keys to invalidate on success. */
  invalidateKeys?: QueryKey[]
}

export interface UseWriteAction {
  state: TxState
  revert: NormalizedRevert | null
  run: (input: WriteActionInput) => Promise<void>
  reset: () => void
}

export function useWriteAction(
  options: { requiredChainId?: number } = {},
): UseWriteAction {
  const { requiredChainId = HASHKEY.id } = options
  const { address, chainId, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()
  const [state, setState] = useState<TxState>('idle')
  const [revert, setRevert] = useState<NormalizedRevert | null>(null)

  const reset = useCallback(() => {
    setState('idle')
    setRevert(null)
  }, [])

  const run = useCallback(
    async (input: WriteActionInput) => {
      setRevert(null)

      if (!isConnected || !address) {
        setState('error')
        setRevert({ message: 'Connect your wallet to continue.' })
        return
      }

      if (input.preflight && !input.preflight.enabled) {
        setState('error')
        setRevert({
          message:
            input.preflight.reason ?? 'This action is not available right now.',
        })
        return
      }

      // Guard the chain before anything is signed.
      try {
        await ensureChain(chainId, requiredChainId, (id) =>
          switchChainAsync({ chainId: id }),
        )
      } catch (error) {
        if (isUserRejection(error)) {
          setState('rejected')
        } else {
          setState('error')
          setRevert({ message: 'Switch to the required network to continue.' })
        }
        return
      }

      const { chain } = getAdapters()
      try {
        // Exact-amount approval to the correct spender, only if needed.
        if (input.approval) {
          const allowance = await chain.getAllowance(
            input.approval.token,
            address,
            input.approval.spender,
          )
          if (allowance < input.approval.amount) {
            setState('approving')
            await chain.approve(
              input.approval.token,
              input.approval.spender,
              input.approval.amount,
            )
          }
        }

        setState('signing')
        await input.send()
        setState('pending')
        setState('confirmed')

        if (input.invalidateKeys) {
          await Promise.all(
            input.invalidateKeys.map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          )
        }
      } catch (error) {
        if (isUserRejection(error)) {
          setState('rejected')
          return
        }
        setState('reverted')
        setRevert(normalizeRevertReason(error))
      }
    },
    [address, chainId, isConnected, requiredChainId, switchChainAsync, queryClient],
  )

  return { state, revert, run, reset }
}

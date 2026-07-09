/**
 * Cross-chain supply from Base (U17, R26, R27). Built on the same write wrapper
 * as same-chain writes but targeting Base (8453): ensure Base → quote the CCIP
 * fee → approve the token → supplyToHashKey with `value: fee`. After the Base tx
 * confirms, the delivery on HashKey is still in flight — a distinct `bridging`
 * state (AE7) until the destination `InboundSupply` fires, tracked by messageId.
 *
 * Mock-first until PaboxoCCIPSender ships on Base; the two-hop is modeled through
 * the indexer adapter.
 */
import { useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { BASE, CROSS_CHAIN } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { Hash } from '#/lib/data'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import type { MarketView } from '#/features/markets/types'

// Destination gas for receiver.ccipReceive -> pool.supplyCollateral. The FIRST supply per user
// deploys their Position (proxy + init), so this must be generous. Verified on mainnet 2026-07-09:
// 2,000,000 ran out of gas on a first-time cross-chain supply (Position deploy). 5M gives margin.
const DEST_GAS_LIMIT = 5_000_000
/** CCIP supply action: 1 = collateral. */
const ACTION_COLLATERAL = 1

export type BridgeStatus = 'idle' | 'bridging' | 'delivered'

// A stand-in CCIP messageId (string literal so it types as Hash without a cast).
const MOCK_MESSAGE_ID: Hash =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'

export function useCrossChainSupply(market: MarketView) {
  const write = useWriteAction({ requiredChainId: BASE.id })
  const { address } = useAccount()
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('idle')
  const [messageId, setMessageId] = useState<Hash | null>(null)

  const supply = useCallback(
    async (amount: bigint) => {
      if (!address) return
      setBridgeStatus('idle')
      setMessageId(null)
      const { chain, indexer } = getAdapters()
      const token = CROSS_CHAIN.bridgeToken.base

      // Quote the CCIP fee first — attached as msg.value on the send.
      const fee = await chain.quoteCrossChainSupply(
        market.poolAddress,
        ACTION_COLLATERAL,
        token,
        amount,
        DEST_GAS_LIMIT,
      )

      const confirmed = await write.run({
        approval: {
          token,
          spender: CROSS_CHAIN.burnMintTokenPool.base,
          amount,
        },
        preflight:
          amount > 0n
            ? { enabled: true }
            : { enabled: false, reason: 'Enter an amount greater than zero.' },
        send: () =>
          chain.supplyToHashKey(
            market.poolAddress,
            ACTION_COLLATERAL,
            token,
            amount,
            DEST_GAS_LIMIT,
            fee,
          ),
      })
      if (!confirmed) return

      // Base tx done; delivery on HashKey pending until InboundSupply.
      setMessageId(MOCK_MESSAGE_ID)
      setBridgeStatus('bridging')
      const status = await indexer.getCrossChainStatus(MOCK_MESSAGE_ID)
      if (status.status === 'delivered') setBridgeStatus('delivered')
    },
    [address, market.poolAddress, write],
  )

  return { ...write, supply, bridgeStatus, messageId }
}

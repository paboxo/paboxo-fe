import { defineChain } from 'viem'
import { HASHKEY } from '#/lib/contracts'
import { HASHKEY_RPC_OVERRIDE } from '#/lib/config/env'

/** HashKey Chain (177) as a wagmi/viem chain — a custom chain, not a built-in. */
export const hashkey = defineChain({
  id: HASHKEY.id,
  name: HASHKEY.name,
  nativeCurrency: {
    name: HASHKEY.name,
    symbol: HASHKEY.nativeSymbol,
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [HASHKEY_RPC_OVERRIDE ?? HASHKEY.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'HashKey Explorer', url: HASHKEY.explorerUrl },
  },
})

/** All chains the wallet offers. HashKey 177 is the only active chain — the
 *  whole money market lives there. Base was the cross-chain (CCIP) supply
 *  source; re-add it here once PaboxoCCIPSender ships on Base. */
export const chains = [hashkey] as const

import { base, defineChain } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { HASHKEY } from '#/lib/contracts'
import { HASHKEY_RPC_OVERRIDE } from '#/lib/config/env'

/** HashKey Chain (177) as an AppKit network — a custom chain, not a built-in. */
export const hashkey = defineChain({
  id: HASHKEY.id,
  caipNetworkId: 'eip155:177',
  chainNamespace: 'eip155',
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

export { base }

/** All networks the app knows — HashKey (home) + Base (cross-chain source). */
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [hashkey, base]

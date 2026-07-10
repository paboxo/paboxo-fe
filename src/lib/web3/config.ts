import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { PROJECT_ID } from '#/lib/config/env'
import { hashkey } from './chains'

// A non-empty placeholder keeps the config buildable in preview (no project id);
// real connect needs a Reown/WalletConnect Cloud project id (VITE_REOWN_PROJECT_ID).
export const projectId = PROJECT_ID || 'paboxo-preview'

// HashKey 177 is the only active network — the whole money market lives there.
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [hashkey]

/** wagmi v3 config, built by the Reown AppKit wagmi adapter (replaces RainbowKit's
 *  getDefaultConfig). `createAppKit` in Web3Provider wires the modal to this. */
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

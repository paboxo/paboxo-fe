import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { cookieStorage, createStorage } from 'wagmi'
import { PROJECT_ID } from '#/lib/config/env'
import { hashkey, networks } from './chains'

// A non-empty placeholder keeps the config buildable in preview (no project id);
// real connect needs VITE_REOWN_PROJECT_ID (see requireProjectId()).
const projectId = PROJECT_ID || 'paboxo-preview'

/** wagmi adapter (SSR-safe: cookieStorage + ssr:true). */
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

export const appkitMetadata = {
  name: 'Paboxo',
  description: 'Money market on HashKey Chain',
  url: 'https://paboxo.app',
  icons: [] as string[],
}

/** Options for `createAppKit` — called client-side only (see Web3Provider). */
export const appkitOptions = {
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: hashkey,
  projectId,
  metadata: appkitMetadata,
}

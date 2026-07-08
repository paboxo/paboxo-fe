import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { PROJECT_ID } from '#/lib/config/env'
import { chains } from './chains'

// A non-empty placeholder keeps the config buildable in preview (no project id);
// real connect needs a WalletConnect Cloud project id (VITE_REOWN_PROJECT_ID).
const projectId = PROJECT_ID || 'paboxo-preview'

/** wagmi config built by RainbowKit — bundled wallets + SSR cookie storage. */
export const wagmiConfig = getDefaultConfig({
  appName: 'Paboxo',
  projectId,
  chains,
  ssr: true,
})

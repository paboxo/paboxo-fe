import { useState } from 'react'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import type { State } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { networks, projectId, wagmiAdapter } from './config'

// The AppKit modal is a browser singleton — initialise it once, on the client
// only (createAppKit touches window), themed to the app's light palette.
if (typeof window !== 'undefined') {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    defaultNetwork: networks[0],
    metadata: {
      name: 'Paboxo',
      description: 'Earn and borrow on HashKey',
      url: 'https://paboxo.app',
      icons: ['/logo192.png'],
    },
    themeMode: 'light',
    themeVariables: { '--w3m-accent': '#0690d4' },
    features: { analytics: false, swaps: false, onramp: false },
  })
}

export function Web3Provider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: State
}) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

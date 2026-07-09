import '@rainbow-me/rainbowkit/styles.css'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import type { State } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { wagmiConfig } from './config'

// Coastal-glass accent so the wallet modal matches the app (azure blue).
const rainbowTheme = lightTheme({
  accentColor: '#0690d4',
  accentColorForeground: '#f2f8fd',
  borderRadius: 'large',
  overlayBlur: 'small',
})

export function Web3Provider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: State
}) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

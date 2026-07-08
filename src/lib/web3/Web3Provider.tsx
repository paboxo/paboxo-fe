import { useState } from 'react'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import type { State } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { appkitOptions, wagmiConfig } from './appkit'

// AppKit initializes the connect modal once, client-side only (it touches the
// DOM); the SSR import never runs it. Always initialized on the client so the
// `useAppKit` hook is available — a preview project id just can't connect.
// Client-only init is the fallback path from U1's SSR spike.
let appkitStarted = false
function ensureAppKit() {
  if (appkitStarted || typeof window === 'undefined') return
  appkitStarted = true
  createAppKit(appkitOptions)
}

export function Web3Provider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: State
}) {
  ensureAppKit()
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

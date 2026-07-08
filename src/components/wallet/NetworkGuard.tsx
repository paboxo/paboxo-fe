import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { EmptyState } from '#/components/ui/states/EmptyState'
import ConnectButton from './ConnectButton'

/**
 * Wallet gate for connect-required surfaces (U7, R15). The market view stays
 * public; the dashboard and write panels wrap their content here so a
 * disconnected visitor gets a connect prompt instead of an empty position.
 * Mount-gated so `useAccount` never runs during SSR (mirrors ConnectButton).
 */
export function NetworkGuard({
  children,
  title = 'Connect your wallet',
  description = 'Connect a wallet to view and manage your position.',
}: {
  children: ReactNode
  title?: string
  description?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { isConnected } = useAccount()

  if (!mounted) return null

  if (!isConnected) {
    return (
      <EmptyState
        title={title}
        description={description}
        action={<ConnectButton />}
      />
    )
  }

  return <>{children}</>
}

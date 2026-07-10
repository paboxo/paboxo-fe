import { useEffect, useState } from 'react'
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
} from '@reown/appkit/react'
import { AccountPill } from '#/components/ui/wallet/AccountPill'
import { HASHKEY } from '#/lib/contracts'

const BUTTON_CLASS =
  'rounded-full px-3 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60'
const CONNECT_STYLE = { background: 'var(--palm)', color: '#f3faf5' }
const WRONG_NETWORK_STYLE = { background: 'var(--danger)', color: '#fff' }

/**
 * Wallet connect entry. Opens Reown AppKit's connect/account/network views while
 * keeping the app's coastal styling + the AccountPill. A `mounted` gate avoids
 * running wallet state on the server (no SSR hydration mismatch).
 */
export default function ConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId, caipNetwork } = useAppKitNetwork()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-hidden="true"
        className={BUTTON_CLASS}
        style={{ ...CONNECT_STYLE, opacity: 0 }}
      >
        Connect
      </button>
    )
  }

  if (!isConnected || !address) {
    return (
      <button
        type="button"
        onClick={() => open({ view: 'Connect' })}
        className={BUTTON_CLASS}
        style={CONNECT_STYLE}
      >
        Connect
      </button>
    )
  }

  if (Number(chainId) !== HASHKEY.id) {
    return (
      <button
        type="button"
        onClick={() => open({ view: 'Networks' })}
        className={BUTTON_CLASS}
        style={WRONG_NETWORK_STYLE}
      >
        Wrong network
      </button>
    )
  }

  return (
    <AccountPill
      address={address}
      chainName={caipNetwork?.name ?? HASHKEY.name}
      onClick={() => open({ view: 'Account' })}
    />
  )
}

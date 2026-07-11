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

/** Invisible, inert placeholder for SSR / pre-mount so no wallet hook runs on
 *  the server (createAppKit is browser-only). */
function ConnectPlaceholder() {
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

/**
 * Wallet connect entry. Opens Reown AppKit's connect/account/network views while
 * keeping the app's coastal styling + the AccountPill. A mount gate keeps the
 * AppKit hooks out of SSR (see WalletControls).
 */
export default function ConnectButton() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <ConnectPlaceholder />
  return <ConnectButtonInner />
}

function ConnectButtonInner() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId, caipNetwork } = useAppKitNetwork()

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

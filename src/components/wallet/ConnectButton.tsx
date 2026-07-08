import { useEffect, useState } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { AccountPill } from '#/components/ui/wallet/AccountPill'
import { PROJECT_ID } from '#/lib/config/env'

const BUTTON_CLASS =
  'rounded-full px-3 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60'
const BUTTON_STYLE = { background: 'var(--palm)', color: '#f3faf5' }

/** Static placeholder rendered during SSR/hydration (before AppKit is ready). */
function ConnectPlaceholder() {
  return (
    <button
      type="button"
      disabled
      className={BUTTON_CLASS}
      style={BUTTON_STYLE}
    >
      Connect
    </button>
  )
}

/** Client-only: `useAppKit` requires `createAppKit` to have run (client). */
function ConnectInner() {
  const { open } = useAppKit()
  const { address, isConnected, chain } = useAccount()
  const ready = Boolean(PROJECT_ID)

  if (isConnected && address) {
    return (
      <AccountPill
        address={address}
        chainName={chain?.name}
        onClick={() => open({ view: 'Account' })}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => ready && open()}
      disabled={!ready}
      title={
        ready ? undefined : 'Set VITE_REOWN_PROJECT_ID to enable wallet connect'
      }
      className={BUTTON_CLASS}
      style={BUTTON_STYLE}
    >
      Connect
    </button>
  )
}

/** Wallet connect entry (U1). Gated behind mount so the AppKit hook never runs on the server. */
export default function ConnectButton() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <ConnectInner /> : <ConnectPlaceholder />
}

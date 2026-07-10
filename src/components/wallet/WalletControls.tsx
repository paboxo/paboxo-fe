import { useEffect, useState } from 'react'
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
} from '@reown/appkit/react'
import { truncateAddress } from '#/components/ui/wallet/AccountPill'
import { HASHKEY } from '#/lib/contracts'

/**
 * Header wallet controls (U11). Renders the chain and account as two sibling
 * chips sized from one shared class contract so their heights match.
 *
 * - The chain chip carries the wrong-network danger state and collapses below
 *   `sm` (the phone header needs the room for the account chip and toggles).
 * - The account chip never collapses.
 *
 * A mount gate keeps the AppKit hooks out of SSR: `createAppKit` runs only in
 * the browser, so the inner component (which calls the hooks) must not render on
 * the server. The outer component renders an inert placeholder until mounted.
 */

// Shared height/shape contract — no display utility here, so each control can
// pick its own (`inline-flex` vs the `hidden … sm:inline-flex` collapse).
const CHIP =
  'items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)]'

const CONNECT_CLASS =
  'rounded-full px-3 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60'
const CONNECT_STYLE = { background: 'var(--palm)', color: '#f3faf5' }

/** Invisible, inert placeholder for SSR / pre-mount so the header does not
 *  shift and no wallet hook runs on the server. */
function ConnectPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-hidden="true"
      className={CONNECT_CLASS}
      style={{ ...CONNECT_STYLE, opacity: 0 }}
    >
      Connect
    </button>
  )
}

export function WalletControls() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <ConnectPlaceholder />
  return <WalletControlsInner />
}

function WalletControlsInner() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId } = useAppKitNetwork()

  if (!isConnected || !address) {
    return (
      <button
        type="button"
        onClick={() => open({ view: 'Connect' })}
        className={CONNECT_CLASS}
        style={CONNECT_STYLE}
      >
        Connect
      </button>
    )
  }

  const unsupported = Number(chainId) !== HASHKEY.id
  return (
    <>
      {/* The chain chip is a button (it opens the network view), so it keeps its
          button role — `role="status"` there would hide that. This region
          carries the announcement instead, and stays empty on a supported chain
          so the chain name is never voiced twice. */}
      <span role="status" className="sr-only">
        {unsupported ? 'Wrong network' : ''}
      </span>
      <button
        type="button"
        data-chain-chip=""
        onClick={() => open({ view: 'Networks' })}
        className={`hidden ${CHIP} sm:inline-flex`}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ background: unsupported ? 'var(--danger)' : 'var(--palm)' }}
        />
        {unsupported ? 'Wrong network' : HASHKEY.name}
      </button>
      <button
        type="button"
        onClick={() => open({ view: 'Account' })}
        className={`inline-flex ${CHIP}`}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ background: 'linear-gradient(90deg,#38a8e0,#6cc6f0)' }}
        />
        <span className="num">{truncateAddress(address)}</span>
      </button>
    </>
  )
}

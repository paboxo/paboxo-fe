import { ConnectButton } from '@rainbow-me/rainbowkit'

/**
 * Header wallet controls (U11). Renders the chain and account as two sibling
 * chips sized from one shared class contract so their heights match. Replaces
 * the old duplicate chain display, which printed the chain name twice.
 *
 * - The chain chip carries the wrong-network danger state and collapses below
 *   `sm` (the phone header needs the room for the account chip and toggles).
 * - The account chip never collapses.
 *
 * `mounted` from RainbowKit gates SSR so no wallet hook runs before ready.
 */

// Shared height/shape contract — no display utility here, so each control can
// pick its own (`inline-flex` vs the `hidden … sm:inline-flex` collapse).
const CHIP =
  'items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)]'

const CONNECT_CLASS =
  'rounded-full px-3 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60'
const CONNECT_STYLE = { background: 'var(--palm)', color: '#f3faf5' }

export function WalletControls() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const connected = mounted && account && chain

        if (!connected) {
          // Not mounted yet: keep an invisible, inert placeholder so the header
          // does not shift when the wallet becomes ready.
          return (
            <button
              type="button"
              disabled={!mounted}
              aria-hidden={mounted ? undefined : 'true'}
              onClick={mounted ? openConnectModal : undefined}
              className={CONNECT_CLASS}
              style={mounted ? CONNECT_STYLE : { ...CONNECT_STYLE, opacity: 0 }}
            >
              Connect
            </button>
          )
        }

        const unsupported = chain.unsupported ?? false
        return (
          <>
            {/* The chain chip is a button (it opens the chain modal), so it
                keeps its button role — `role="status"` there would hide that.
                This region carries the announcement instead, and stays empty on
                a supported chain so the chain name is never voiced twice. */}
            <span role="status" className="sr-only">
              {unsupported ? 'Wrong network' : ''}
            </span>
            <button
              type="button"
              data-chain-chip=""
              onClick={openChainModal}
              className={`hidden ${CHIP} sm:inline-flex`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{
                  background: unsupported ? 'var(--danger)' : 'var(--palm)',
                }}
              />
              {unsupported ? 'Wrong network' : chain.name}
            </button>
            <button
              type="button"
              onClick={openAccountModal}
              className={`inline-flex ${CHIP}`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: 'linear-gradient(90deg,#38a8e0,#6cc6f0)' }}
              />
              <span className="num">{account.displayName}</span>
            </button>
          </>
        )
      }}
    </ConnectButton.Custom>
  )
}

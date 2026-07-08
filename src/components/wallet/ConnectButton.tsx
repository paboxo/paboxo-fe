import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { AccountPill } from '#/components/ui/wallet/AccountPill'

const BUTTON_CLASS =
  'rounded-full px-3 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60'
const CONNECT_STYLE = { background: 'var(--palm)', color: '#f3faf5' }
const WRONG_NETWORK_STYLE = { background: 'var(--danger)', color: '#fff' }

/**
 * Wallet connect entry. Uses RainbowKit's connect/account/chain modals under the
 * hood (ConnectButton.Custom) while keeping the app's coastal styling + the
 * AccountPill. `mounted` from RainbowKit gates SSR — no hook runs before ready.
 */
export default function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
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

        if (!account || !chain) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={BUTTON_CLASS}
              style={CONNECT_STYLE}
            >
              Connect
            </button>
          )
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className={BUTTON_CLASS}
              style={WRONG_NETWORK_STYLE}
            >
              Wrong network
            </button>
          )
        }

        return (
          <AccountPill
            address={account.address}
            chainName={chain.name}
            onClick={openAccountModal}
          />
        )
      }}
    </RainbowConnectButton.Custom>
  )
}

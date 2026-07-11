/**
 * Real `PaymentGateway`, wired to HSP (Human-Signed Payments) — LIVE on HashKey
 * mainnet 177, settling in USDC.e. Active only when `VITE_PAYMENT_MODE=hsp`; the
 * mock stays the build-time default, so the app runs with no HSP creds at all.
 *
 * The gateway is a plain module (not a hook), so at `pay()` time it reads the
 * live wallet from the app's wagmi config singleton (KTD2): the EIP-1193 provider
 * + connected address feed HSP's `eip1193` signer. `pay()` does one wallet
 * signature (the EIP-712 mandate) then one ERC-20 `transfer` (no approve — direct
 * transfer of the chain-pinned USDC.e), registers + observes at the coordinator,
 * and hands back a settle-able handle. `verify()` independently re-fetches
 * `GET /payments/:id` and replays the `(mandate, receipt)` through the on-chain
 * HSP adapter via `HSPVerifier` — an ACCEPT that never trusts the coordinator
 * (KTD3). `@hsp/sdk` + `@hsp/core` are vendored under `vendor/hsp/*`.
 */
import type { Address, EIP1193Provider } from 'viem'
import { getConnection } from '@wagmi/core'
import { HSPClient, HSPVerifier } from '@hsp/sdk'
import { resolveChain } from '@hsp/core/chains/index'
import type { ChainConfig, ChainName } from '@hsp/core/chains/index'
import type { Receipt, SignedMandate } from '@hsp/core'
import { wagmiConfig } from '#/lib/web3/config'
import {
  HASHKEY_RPC_OVERRIDE,
  HSP_ADAPTER_ADDRESS,
  HSP_API_KEY,
  HSP_CHAIN,
  HSP_COORDINATOR_URL,
} from '#/lib/config/env'
import type { Decision, PaymentGateway, PaymentReceipt } from './types'

/** The coordinator's `GET /payments/:id` shape (public; no apiKey). */
interface CoordinatorPaymentDetail {
  status?: string
  mandate?: SignedMandate
  receipts?: Array<{ receipt: Receipt }>
}

/** Resolve the pinned HSP chain config for the selected settlement chain. */
function hspChain(): ChainConfig {
  const chainName = HSP_CHAIN as ChainName
  if (chainName !== 'hashkey' && chainName !== 'hashkey-testnet') {
    throw new Error(
      `VITE_HSP_CHAIN='${HSP_CHAIN}' is unsupported — use 'hashkey' (mainnet 177) or 'hashkey-testnet' (133).`,
    )
  }
  // The public HashKey RPC sends no CORS headers, so the SDK's browser-side
  // receipt-wait (waitForTransactionReceipt) is blocked on mainnet unless routed
  // through the app's same-origin proxy. Reuse VITE_HASHKEY_RPC when set; testnet
  // keeps its own default RPC.
  const overrides =
    chainName === 'hashkey' && HASHKEY_RPC_OVERRIDE
      ? { rpcUrl: HASHKEY_RPC_OVERRIDE }
      : {}
  return resolveChain(chainName, overrides)
}

/** The HSP coordinator API key, or a loud error if hsp mode is misconfigured. */
function requireApiKey(): string {
  if (!HSP_API_KEY) {
    throw new Error(
      'VITE_HSP_API_KEY is not set — hsp mode needs the HSP coordinator API key (see .env.example; keep the real key in .env.local).',
    )
  }
  return HSP_API_KEY
}

/** The live EIP-1193 provider + connected account from the app's wagmi config. */
async function walletSigner(
  chain: ChainConfig,
): Promise<{ provider: EIP1193Provider; address: Address }> {
  const conn = getConnection(wagmiConfig)
  if (conn.status !== 'connected') {
    throw new Error('Connect your wallet before enabling protection.')
  }
  if (conn.chainId !== chain.chainId) {
    throw new Error(
      `Switch your wallet to ${chain.name} (chainId ${chain.chainId}) to pay the HSP fee.`,
    )
  }
  const provider = (await conn.connector.getProvider({
    chainId: chain.chainId,
  })) as EIP1193Provider
  return { provider, address: conn.address }
}

/** Build a payer-side client bound to the live wallet. Throws if misconfigured. */
async function buildClient(): Promise<{ client: HSPClient; chain: ChainConfig }> {
  const apiKey = requireApiKey()
  const chain = hspChain()
  const { provider, address } = await walletSigner(chain)
  const client = new HSPClient({
    coordinatorUrl: HSP_COORDINATOR_URL,
    apiKey,
    chain,
    chainName: chain.name,
    signer: { kind: 'eip1193', provider, address },
  })
  return { client, chain }
}

/** Independent public read of a payment's stored mandate + admitted receipts. */
async function fetchPaymentDetail(
  paymentId: string,
): Promise<CoordinatorPaymentDetail> {
  const base = HSP_COORDINATOR_URL.replace(/\/$/, '')
  const res = await fetch(`${base}/payments/${paymentId}`)
  if (!res.ok) {
    throw new Error(
      `HSP coordinator GET /payments/${paymentId} failed: HTTP ${res.status}`,
    )
  }
  return (await res.json()) as CoordinatorPaymentDetail
}

/** The most recently admitted settlement receipt, or null if none yet. */
function latestReceipt(detail: CoordinatorPaymentDetail): Receipt | null {
  const list = detail.receipts
  return Array.isArray(list) && list.length > 0
    ? list[list.length - 1].receipt
    : null
}

export const hspPaymentGateway: PaymentGateway = {
  async pay(req) {
    const { client } = await buildClient()
    const handle = await client.pay({
      to: req.to,
      amount: req.amount,
      // Compliance is out of scope here (needs an issuer URL) — forwarded only
      // if a caller explicitly requests it, so the SDK surfaces a clear error.
      ...(req.compliance?.length ? { profile: { compliance: req.compliance } } : {}),
    })
    return {
      paymentId: handle.paymentId,
      txHash: handle.txHash,
      status: handle.status,
      awaitSettled: async () => {
        const snap = await handle.awaitSettled()
        const detail = snap as unknown as CoordinatorPaymentDetail
        const receipt: PaymentReceipt = {
          paymentId: handle.paymentId,
          mandate: detail.mandate ?? handle.mandate,
          receipt: latestReceipt(detail),
          attestations: [],
        }
        return { status: snap.status, receipt }
      },
    }
  },

  async verify(receipt): Promise<Decision> {
    const chain = hspChain()
    // Re-fetch independently (KTD3) — never trust what pay() cached. Fall back to
    // the pay()-time triple if the fresh read lags.
    let detail: CoordinatorPaymentDetail
    try {
      detail = await fetchPaymentDetail(receipt.paymentId)
    } catch {
      detail = {}
    }
    const mandate = (detail.mandate ?? receipt.mandate) as SignedMandate | null
    const settlementReceipt = (latestReceipt(detail) ??
      receipt.receipt) as Receipt | null
    if (!mandate || !settlementReceipt) {
      return {
        ok: false,
        outcomeClass: 'RETRYABLE',
        reason: 'No admitted HSP receipt yet — the payment has not settled.',
      }
    }
    const verifier = new HSPVerifier({
      chain,
      adapterAddress: HSP_ADAPTER_ADDRESS as Address,
    })
    const decision = await verifier.verify(mandate, settlementReceipt)
    const reason = decision.errorDetail ?? decision.errorCode
    return {
      ok: decision.ok,
      outcomeClass: decision.outcomeClass,
      ...(reason ? { reason } : {}),
    }
  },

  explorerUrl(paymentId) {
    return `${HSP_COORDINATOR_URL.replace(/\/$/, '')}/explorer?id=${paymentId}`
  },
}

/**
 * Real `PaymentGateway`, wired to HSP. HSP is pre-1.0, testnet-only, and NOT yet
 * on npm (`@hsp/sdk` does not resolve), so every method THROWS until the sandbox
 * ships and the creds are supplied. Selecting it (`VITE_PAYMENT_MODE=hsp`)
 * without those creds fails loudly rather than silently — the mock stays the
 * default, so the app builds and runs with no HSP dependency at all.
 *
 * Do NOT install or import any `@hsp` package here; the block below is a
 * reference sketch of the real integration, kept as a comment on purpose.
 *
 * Real sketch (once `@hsp/sdk` + a coordinator URL + an API key + the on-chain
 * adapter address exist):
 *
 *   import { HSPClient, HSPVerifier } from '@hsp/sdk'
 *
 *   const client = new HSPClient({ coordinatorUrl, apiKey, signer, chain })
 *   const handle = await client.pay({
 *     to,
 *     amount,
 *     // A compliance profile is attached only when the caller requires one.
 *     profile: compliance && { compliance },
 *   })
 *   const settled = await handle.awaitSettled()
 *   const { mandate, receipt, attestations } = settled.receipt
 *
 *   const verifier = new HSPVerifier({ chain, adapterAddress })
 *   const { ok, outcomeClass } = await verifier.verify(mandate, receipt, attestations)
 *   // Rule: ACCEPT iff requiredCapabilities ⊆ satisfiedCapabilities
 *   // (otherwise POLICY / RETRYABLE / PERMANENT with a reason).
 */
import type { PaymentGateway } from './types'

const NOT_WIRED =
  'HSP gateway not wired — awaiting HSP sandbox release (@hsp/sdk, coordinator URL, API key, adapter address)'

export const hspPaymentGateway: PaymentGateway = {
  pay() {
    throw new Error(NOT_WIRED)
  },
  verify() {
    throw new Error(NOT_WIRED)
  },
  explorerUrl() {
    throw new Error(NOT_WIRED)
  },
}

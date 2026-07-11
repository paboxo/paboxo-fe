/**
 * Mock `PaymentGateway` (the preview default). Returns a deterministic, settled
 * payment for every request and an unconditional ACCEPT from `verify`, so the
 * protection flow builds and demos end-to-end with no HSP creds — mirroring how
 * `mockChainAdapter` stubs the chain before the live viem adapter is wired.
 *
 * Real behavior each method will have once HSP ships (see `gateway.hsp.ts`):
 * - `pay`: submits the payment to the HSP coordinator, which returns a handle
 *   whose `paymentId` IS the on-chain mandate hash; `awaitSettled()` polls the
 *   coordinator until the mandate is finalized and yields the receipt triple.
 * - `verify`: replays the `(mandate, receipt, attestations)` triple through the
 *   on-chain HSP adapter and returns ACCEPT iff every required capability is
 *   satisfied — otherwise POLICY / RETRYABLE / PERMANENT with a reason.
 * - `explorerUrl`: deep-links to the payment in the HSP explorer for the chain.
 */
import { keccak256, toHex } from 'viem'
import type { PaymentGateway, PaymentReceipt } from './types'

/**
 * A deterministic pseudo-mandate-hash derived purely from the request. No
 * `Math.random` / `Date.now`, so the same request always yields the same id —
 * tests and previews stay reproducible, and it looks like the real `0x`-hash.
 */
function mockPaymentId(to: string, amount: bigint): string {
  return keccak256(toHex(`hsp-mock:${to.toLowerCase()}:${amount.toString()}`))
}

export const mockPaymentGateway: PaymentGateway = {
  async pay(req) {
    const paymentId = mockPaymentId(req.to, req.amount)
    const receipt: PaymentReceipt = {
      paymentId,
      mandate: {},
      receipt: {},
      attestations: [],
    }
    return {
      paymentId,
      status: 'PENDING',
      awaitSettled: () =>
        Promise.resolve({ status: 'SETTLED', receipt }),
    }
  },

  verify(_receipt) {
    // The mock always accepts — the verifier's ACCEPT/POLICY logic lives in the
    // real HSP gateway. `_receipt` is intentionally unused here.
    return Promise.resolve({ ok: true, outcomeClass: 'ACCEPT' })
  },

  explorerUrl(paymentId) {
    return `https://hsp.example/explorer/${paymentId}`
  },
}

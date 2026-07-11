/**
 * The payment seam (mirrors the data seam in `#/lib/data`). Everything that
 * talks to HSP goes through `PaymentGateway`, so the feature builds against a
 * stable interface and the mock↔hsp swap is a single registry flip — exactly
 * like the chain adapter's mock↔live swap.
 *
 * HSP (Human-Signed Payments) is pre-1.0, testnet-only, and NOT yet on npm, so
 * the real client is referenced in comments only (`gateway.hsp.ts`); the default
 * gateway is the mock and nothing breaks when HSP is absent.
 *
 * The shapes track the real HSP surface: `hsp.pay()` returns a handle carrying
 * `paymentId === mandateHash`, a `txHash`, a `status`, and `awaitSettled()`; a
 * verifier then checks the `(mandate, receipt, attestations)` triple and returns
 * an ACCEPT / RETRYABLE / POLICY / PERMANENT outcome.
 */
import type { Address } from '#/lib/contracts'

/**
 * The verifier's outcome bucket.
 * - `ACCEPT`    — the payment satisfies policy; proceed.
 * - `RETRYABLE` — a transient fault; the caller may try again.
 * - `POLICY`    — a compliance/policy rule rejected it (e.g. sanctions/KYC).
 * - `PERMANENT` — a terminal failure; do not retry.
 */
export type OutcomeClass = 'ACCEPT' | 'RETRYABLE' | 'POLICY' | 'PERMANENT'

/** Compliance capabilities a payer can be required to satisfy. */
export type ComplianceCap = 'kyc' | 'sanctions'

export interface PayRequest {
  /** Fee recipient. */
  to: Address
  /** Amount in the fee token's base units. */
  amount: bigint
  /** Compliance capabilities the payment must satisfy for an ACCEPT. */
  compliance?: ComplianceCap[]
}

/** The HSP `(mandate, receipt, attestations)` triple the verifier consumes. */
export interface PaymentReceipt {
  /** `paymentId === mandateHash` in HSP. */
  paymentId: string
  mandate: unknown
  receipt: unknown
  attestations: unknown[]
}

export interface SettledPayment {
  status: string
  receipt: PaymentReceipt
}

/**
 * The handle returned by `pay()`, mirroring HSP's `hsp.pay()`:
 * `paymentId === mandateHash`, an optional on-chain `txHash`, a `status`, and an
 * `awaitSettled()` that resolves once the payment is finalized.
 */
export interface PaymentHandle {
  paymentId: string
  txHash?: string
  status: string
  awaitSettled: () => Promise<SettledPayment>
}

export interface Decision {
  ok: boolean
  outcomeClass: OutcomeClass
  reason?: string
}

export interface PaymentGateway {
  /** Open a payment; resolves to a handle you can await to settlement. */
  pay: (req: PayRequest) => Promise<PaymentHandle>
  /** Verify a settled receipt's `(mandate, receipt, attestations)` triple. */
  verify: (receipt: PaymentReceipt) => Promise<Decision>
  /** A human-facing explorer link for a payment, or `undefined` if none. */
  explorerUrl: (paymentId: string) => string | undefined
}

/**
 * The single payment swap point (mirrors `src/lib/data/registry.ts`). Callers
 * use `getPaymentGateway()` and never import a concrete gateway, so flipping
 * `VITE_PAYMENT_MODE` between `mock` and `hsp` is the only change needed to go
 * from the built-in mock to the real HSP coordinator. The default is `mock`, so
 * the app builds and runs with no HSP creds.
 */
import type { PaymentMode } from '#/lib/config/env'
import { PAYMENT_MODE } from '#/lib/config/env'
import type { PaymentGateway } from './types'
import { mockPaymentGateway } from './gateway.mock'
import { hspPaymentGateway } from './gateway.hsp'

/** Pure resolver — takes the mode explicitly so it is trivially testable. */
export function resolvePaymentGateway(mode: PaymentMode): PaymentGateway {
  return mode === 'hsp' ? hspPaymentGateway : mockPaymentGateway
}

/** The app-wide accessor, bound to the build-time `VITE_PAYMENT_MODE`. */
export function getPaymentGateway(): PaymentGateway {
  return resolvePaymentGateway(PAYMENT_MODE)
}

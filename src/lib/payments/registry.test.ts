import { describe, expect, it } from 'vitest'
import { getPaymentGateway, resolvePaymentGateway } from './registry'
import { mockPaymentGateway } from './gateway.mock'
import { hspPaymentGateway } from './gateway.hsp'
import type { PayRequest } from './types'

const TREASURY = '0x000000000000000000000000000000000000dEaD' as const
const REQ: PayRequest = { to: TREASURY, amount: 1_000_000n }

// Covers the mock↔hsp swap point: the registry is the sole selector, the mock is
// the default, and the mock gateway settles + ACCEPTs so the flow runs creds-free.
describe('payment registry', () => {
  it('resolves the mock gateway under mock mode', () => {
    expect(resolvePaymentGateway('mock')).toBe(mockPaymentGateway)
  })

  it('resolves the hsp gateway under hsp mode', () => {
    expect(resolvePaymentGateway('hsp')).toBe(hspPaymentGateway)
  })

  it('defaults to the mock gateway (VITE_PAYMENT_MODE unset)', () => {
    expect(getPaymentGateway()).toBe(mockPaymentGateway)
  })
})

describe('mock payment gateway', () => {
  it('verifies to an ACCEPT decision', async () => {
    const decision = await mockPaymentGateway.verify({
      paymentId: 'x',
      mandate: {},
      receipt: {},
      attestations: [],
    })
    expect(decision).toEqual({ ok: true, outcomeClass: 'ACCEPT' })
  })

  it('settles a payment to SETTLED with the receipt triple', async () => {
    const handle = await mockPaymentGateway.pay(REQ)
    expect(handle.status).toBe('PENDING')
    const settled = await handle.awaitSettled()
    expect(settled.status).toBe('SETTLED')
    expect(settled.receipt.paymentId).toBe(handle.paymentId)
    expect(settled.receipt.attestations).toEqual([])
  })

  it('derives a deterministic paymentId from the request (no time/randomness)', async () => {
    const a = await mockPaymentGateway.pay(REQ)
    const b = await mockPaymentGateway.pay(REQ)
    expect(a.paymentId).toBe(b.paymentId)
    expect(a.paymentId).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('builds an explorer url for a payment id', () => {
    expect(mockPaymentGateway.explorerUrl('abc')).toBe(
      'https://hsp.example/explorer/abc',
    )
  })
})

// The real HSP gateway is wired but fails loudly without creds + a live wallet
// (neither exists in the test env), and its explorer link is pure string-building.
// A genuine on-chain pay/verify is a manual live test — see docs/HSP-PROTECTION.md.
describe('hsp payment gateway', () => {
  it('rejects pay() without HSP creds / a connected wallet', async () => {
    await expect(hspPaymentGateway.pay(REQ)).rejects.toThrow(
      /VITE_HSP_API_KEY|Connect your wallet/,
    )
  })

  it('builds a coordinator explorer link for a payment id', () => {
    expect(hspPaymentGateway.explorerUrl('0xabc')).toMatch(
      /\/explorer\?id=0xabc$/,
    )
  })
})

import { describe, expect, it } from 'vitest'
import { isUserRejection, normalizeRevertReason } from './revertReason'

describe('normalizeRevertReason', () => {
  it('maps a known error name in the cause chain to plain language', () => {
    const error = {
      name: 'ContractFunctionExecutionError',
      shortMessage: 'execution reverted',
      cause: { name: 'HealthFactorTooLow' },
    }
    const result = normalizeRevertReason(error)
    expect(result.message).toMatch(/risk of liquidation/)
    expect(result.raw).toBe('execution reverted')
  })

  it('falls back to a humane generic message for an unmapped revert, never raw hex', () => {
    const error = {
      name: 'ContractFunctionRevertedError',
      shortMessage: '0x1a2b',
    }
    const result = normalizeRevertReason(error)
    expect(result.message).toMatch(/failed on-chain/)
    expect(result.message).not.toContain('0x')
    expect(result.raw).toBe('0x1a2b')
  })
})

describe('isUserRejection', () => {
  it('detects a wallet rejection by name or 4001 code', () => {
    expect(isUserRejection({ name: 'UserRejectedRequestError' })).toBe(true)
    expect(isUserRejection({ code: 4001 })).toBe(true)
    expect(isUserRejection({ name: 'HealthFactorTooLow' })).toBe(false)
  })
})

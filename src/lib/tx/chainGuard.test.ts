import { describe, expect, it, vi } from 'vitest'
import { ensureChain } from './chainGuard'

describe('ensureChain', () => {
  it('no-ops when already on the required chain', async () => {
    const switchChain = vi.fn()
    await ensureChain(177, 177, switchChain)
    expect(switchChain).not.toHaveBeenCalled()
  })

  it('requests a switch when on the wrong chain', async () => {
    const switchChain = vi.fn().mockResolvedValue(undefined)
    await ensureChain(1, 177, switchChain)
    expect(switchChain).toHaveBeenCalledWith(177)
  })

  it('requests a switch when the chain is unknown (undefined)', async () => {
    const switchChain = vi.fn().mockResolvedValue(undefined)
    await ensureChain(undefined, 177, switchChain)
    expect(switchChain).toHaveBeenCalledWith(177)
  })

  it('propagates a rejected switch', async () => {
    const switchChain = vi.fn().mockRejectedValue(new Error('user rejected'))
    await expect(ensureChain(1, 177, switchChain)).rejects.toThrow(
      'user rejected',
    )
  })
})

import { describe, expect, it } from 'vitest'
import { requireProjectId } from '#/lib/config/env'
import { hashkey } from './chains'
import { wagmiConfig } from './config'

describe('web3 config (Reown AppKit + wagmi v3)', () => {
  it('defines HashKey Chain 177 and includes it in the wagmi config', () => {
    expect(hashkey.id).toBe(177)
    const chainIds = wagmiConfig.chains.map((chain) => chain.id)
    expect(chainIds).toContain(177)
  })

  it('declares Multicall3 so batched reads batch instead of falling back', () => {
    expect(hashkey.contracts.multicall3.address).toBe(
      '0xcA11bde05977b3631167028862bE2a173976CA11',
    )
  })

  it('keeps the rpc and explorer config intact alongside the contracts entry', () => {
    expect(hashkey.rpcUrls.default.http[0]).toMatch(/^https?:\/\//)
    expect(hashkey.blockExplorers.default.name).toBe('HashKey Explorer')
  })

  it('requireProjectId throws a clear error when the env var is missing', () => {
    expect(() => requireProjectId()).toThrow(/VITE_REOWN_PROJECT_ID/)
  })
})

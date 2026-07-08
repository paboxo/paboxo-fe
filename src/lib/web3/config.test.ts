import { describe, expect, it } from 'vitest'
import { requireProjectId } from '#/lib/config/env'
import { hashkey } from './chains'
import { wagmiConfig } from './config'

describe('web3 config (RainbowKit)', () => {
  it('defines HashKey Chain 177 and includes it in the wagmi config', () => {
    expect(hashkey.id).toBe(177)
    const chainIds = wagmiConfig.chains.map((chain) => chain.id)
    expect(chainIds).toContain(177)
  })

  it('requireProjectId throws a clear error when the env var is missing', () => {
    expect(() => requireProjectId()).toThrow(/VITE_REOWN_PROJECT_ID/)
  })
})

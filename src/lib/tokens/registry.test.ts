import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TOKENS } from '#/lib/contracts'
import { TOKEN_REGISTRY, getTokenByAddress } from './registry'

const PXWHSK = '0xc3be8ab4CA0cefE3119A765b324bBDF54a16A65b'
const PXWHSK_XC = '0x7c9cF703903680ae5EB6ec2Bb2BEbb1ec751918A'

describe('token registry', () => {
  it('resolves a checksummed and a lowercased address to the same entry', () => {
    const checksummed = getTokenByAddress(PXWHSK)
    const lowercased = getTokenByAddress(
      PXWHSK.toLowerCase() as typeof PXWHSK,
    )
    expect(checksummed).toBeDefined()
    expect(checksummed).toBe(lowercased)
    expect(checksummed?.label).toBe('pxWHSK')
  })

  it('returns undefined for an address not in the registry', () => {
    expect(
      getTokenByAddress('0x0000000000000000000000000000000000000000'),
    ).toBeUndefined()
  })

  it('has decimals matching TOKENS for the four tokens both define', () => {
    for (const { address, decimals } of Object.values(TOKENS)) {
      const entry = getTokenByAddress(address)
      expect(entry).toBeDefined()
      expect(entry?.decimals).toBe(decimals)
    }
  })

  it('distinguishes pxWHSK from cross-chain pxWHSK by label and logo', () => {
    const sameChain = getTokenByAddress(PXWHSK)
    const crossChain = getTokenByAddress(PXWHSK_XC)
    expect(sameChain).toBeDefined()
    expect(crossChain).toBeDefined()
    expect(sameChain?.label).not.toBe(crossChain?.label)
    expect(sameChain?.logo).not.toBe(crossChain?.logo)
  })

  it('names a logo file that exists under public/tokens for every entry', () => {
    const tokensDir = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../public/tokens',
    )
    const files = new Set(readdirSync(tokensDir))
    for (const entry of Object.values(TOKEN_REGISTRY)) {
      const filename = entry.logo.replace(/^\/tokens\//, '')
      expect(files.has(filename)).toBe(true)
    }
  })
})

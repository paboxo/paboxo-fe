import type { Address } from '#/lib/contracts'

/**
 * The one address-keyed source for a token's display label, decimals, and logo.
 *
 * Keyed by the token's **lowercased** address so callers can look up an entry
 * without worrying about checksum casing. Decimals are hardcoded here on
 * purpose — a later unit verifies them at runtime against each token's
 * `decimals()`.
 *
 * CRITICAL: pxWHSK (0xc3be8ab4…) and cross-chain pxWHSK (0x7c9cF703…) are two
 * different contracts that BOTH return "pxWHSK" from `symbol()` on-chain. This
 * registry is the only thing that can tell them apart, so they carry different
 * labels AND different logo paths.
 */
export interface TokenEntry {
  /** Human-facing label. Distinct per contract (see the two pxWHSK entries). */
  label: string
  /** Token decimals. Hardcoded; verified on-chain 2026-07-10. */
  decimals: number
  /** Public path to the token's 64x64 WebP logo under `public/tokens/`. */
  logo: string
}

/**
 * The five known Paboxo tokens, keyed by lowercased address.
 * Addresses mirror `TOKENS` / `CROSS_CHAIN` in src/lib/contracts/addresses.ts.
 */
export const TOKEN_REGISTRY: Readonly<Record<string, TokenEntry>> =
  Object.freeze({
    '0x4852bc014401415c4ce4788a04cab019d1527aaa': {
      label: 'pxUSDT',
      decimals: 6,
      logo: '/tokens/usdt.webp',
    },
    '0xc3be8ab4ca0cefe3119a765b324bbdf54a16a65b': {
      label: 'pxWHSK',
      decimals: 18,
      logo: '/tokens/whsx.webp',
    },
    '0x718b1b67f287571767452cc7d24bcd95c63dba13': {
      label: 'pxWBTC',
      decimals: 8,
      logo: '/tokens/wbtc.webp',
    },
    '0x46638ad472507482b7d5ba45124e93d16bc97ece': {
      label: 'pxWETH',
      decimals: 18,
      logo: '/tokens/weth.webp',
    },
    '0x7c9cf703903680ae5eb6ec2bb2bebb1ec751918a': {
      label: 'pxWHSK-xc',
      decimals: 18,
      logo: '/tokens/whsx-xc.webp',
    },
  })

/**
 * Resolve a token's registry entry by address (any casing).
 *
 * Returns `undefined` for an address not in the registry — the caller decides
 * what an unknown token means (a later unit drops such a pool and warns).
 */
export function getTokenByAddress(address: Address): TokenEntry | undefined {
  return TOKEN_REGISTRY[address.toLowerCase()]
}

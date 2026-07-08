import { describe, expect, it } from 'vitest'
import { MARKETS, getMarketConfig } from './markets'
import { CROSS_CHAIN, TOKENS } from './addresses'

// Covers R6: the market map exposes exactly the 4 live markets, all borrowing
// pxUSDT, with the same-chain and cross-chain pxWHSK collateral kept distinct.
describe('markets config', () => {
  it('exposes exactly the 4 live markets', () => {
    expect(MARKETS).toHaveLength(4)
    expect(MARKETS.map((m) => m.id)).toEqual([
      'pxwhsk',
      'pxwbtc',
      'pxweth',
      'pxwhsk-xchain',
    ])
  })

  it('every market borrows pxUSDT', () => {
    for (const market of MARKETS) {
      expect(market.borrowSymbol).toBe('pxUSDT')
    }
  })

  it('has a unique pool address per market', () => {
    const pools = new Set(MARKETS.map((m) => m.pool.toLowerCase()))
    expect(pools.size).toBe(MARKETS.length)
  })

  it('keeps same-chain and cross-chain pxWHSK collateral distinct', () => {
    const sameChain = getMarketConfig('pxwhsk')
    const crossChain = getMarketConfig('pxwhsk-xchain')
    expect(sameChain?.collateralAddress).toBe(TOKENS.pxWHSK.address)
    expect(crossChain?.collateralAddress).toBe(CROSS_CHAIN.bridgeToken.hashkey)
    expect(sameChain?.collateralAddress).not.toBe(crossChain?.collateralAddress)
    expect(crossChain?.crossChain).toBe(true)
  })

  it('carries LTV strictly below the liquidation threshold for every market', () => {
    for (const market of MARKETS) {
      expect(market.ltv).toBeLessThan(market.liqThreshold)
    }
  })

  it('returns undefined for an unknown market id', () => {
    expect(getMarketConfig('nope')).toBeUndefined()
  })
})

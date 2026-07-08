import { describe, expect, it } from 'vitest'
import { NO_DEBT, healthBuffer, healthZone, requiredDropPct } from './health'

describe('healthZone', () => {
  it('maps health factors to named zones at the boundaries', () => {
    expect(healthZone(2.41).key).toBe('safe')
    expect(healthZone(1.7).key).toBe('comfortable')
    expect(healthZone(1.35).key).toBe('watch')
    expect(healthZone(1.15).key).toBe('atRisk')
    expect(healthZone(1.05).key).toBe('critical')
    expect(healthZone(0.9).key).toBe('liquidatable')
    expect(healthZone(NO_DEBT).key).toBe('noDebt')
  })

  it('carries a tone and a non-color shape for every zone', () => {
    expect(healthZone(2.41).tone).toBe('safe')
    expect(healthZone(1.35).tone).toBe('caution')
    expect(healthZone(1.15).tone).toBe('danger')
    expect(healthZone(NO_DEBT).shape).toBe('∞')
  })
})

describe('healthBuffer', () => {
  it('empties toward danger — lower HF yields a shorter buffer', () => {
    expect(healthBuffer(2.5)).toBe(1)
    expect(healthBuffer(1.5)).toBeCloseTo(0.5, 5)
    expect(healthBuffer(1.1)).toBeCloseTo(0.1, 5)
    expect(healthBuffer(1)).toBe(0)
    expect(healthBuffer(0.8)).toBe(0)
    expect(healthBuffer(NO_DEBT)).toBe(1)
    expect(healthBuffer(1.2)).toBeLessThan(healthBuffer(1.6))
  })
})

describe('requiredDropPct', () => {
  it('computes the price drop to liquidation', () => {
    expect(requiredDropPct(1.08, 0.84)).toBeCloseTo(-22.2, 1)
    expect(requiredDropPct(0, 1)).toBe(0)
  })
})

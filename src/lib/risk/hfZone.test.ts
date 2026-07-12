import { describe, expect, it } from 'vitest'
import { HF_BUFFER, HF_TARGET, hfZone } from './hfZone'

describe('hfZone', () => {
  it('maps health factors to the agent color zones (AE2)', () => {
    expect(hfZone(1.31).key).toBe('healthy')
    expect(hfZone(1.2).key).toBe('watch')
    expect(hfZone(1.08).key).toBe('danger')
    expect(hfZone(0.98).key).toBe('liquidatable')
  })

  it('lands boundary values in the higher-safety zone', () => {
    expect(hfZone(HF_TARGET).key).toBe('healthy') // 1.30
    expect(hfZone(HF_BUFFER).key).toBe('watch') // 1.15
    expect(hfZone(1).key).toBe('danger') // 1.00
  })

  it('treats a no-debt position (HF = ∞) as healthy', () => {
    expect(hfZone(Number.POSITIVE_INFINITY).key).toBe('healthy')
    expect(hfZone(NaN).key).toBe('healthy')
  })

  it('carries a non-color shape for every zone', () => {
    expect(hfZone(1.31).shape).toBe('●')
    expect(hfZone(1.2).shape).toBe('◐')
    expect(hfZone(1.08).shape).toBe('△')
    expect(hfZone(0.98).shape).toBe('⛔')
  })

  it('only the watch zone explains the agent action range', () => {
    expect(hfZone(1.2).note).toMatch(/1\.15.*1\.30/)
    expect(hfZone(1.31).note).toBeUndefined()
    expect(hfZone(1.08).note).toBeUndefined()
  })

  it('maps each zone to a distinct color token (green/yellow/orange/red)', () => {
    const colors = [hfZone(1.4), hfZone(1.2), hfZone(1.05), hfZone(0.9)].map(
      (z) => z.color,
    )
    expect(new Set(colors).size).toBe(4)
  })
})

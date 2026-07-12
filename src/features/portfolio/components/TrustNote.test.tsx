// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustNote } from './TrustNote'

describe('TrustNote (R12)', () => {
  it('states the three trust promises', () => {
    render(<TrustNote />)

    expect(screen.getByText(/funds never leave it/i)).toBeTruthy()
    expect(screen.getByText(/revoke/i)).toBeTruthy()
    expect(screen.getByText(/deterministic\s+on-chain math/i)).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NetworkBadge } from './NetworkBadge'

describe('NetworkBadge', () => {
  it('renders the HashKey network mark from the WHSK logo', () => {
    render(<NetworkBadge />)
    expect(screen.getByText(/network:/)).toBeTruthy()
    const img = screen.getByAltText('HashKey')
    expect(img.getAttribute('src')).toBe('/tokens/whsx.webp')
  })
})

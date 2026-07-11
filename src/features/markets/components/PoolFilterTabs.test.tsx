// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PoolFilterTabs } from './PoolFilterTabs'

describe('PoolFilterTabs', () => {
  it('renders three segments with All Pools active and the others inert', () => {
    render(<PoolFilterTabs />)
    const all = screen.getByRole('button', { name: 'All Pools' })
    expect(all.getAttribute('aria-pressed')).toBe('true')
    expect(all.hasAttribute('disabled')).toBe(false)

    expect(
      screen.getByRole('button', { name: 'High APY' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Stablecoins' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })
})

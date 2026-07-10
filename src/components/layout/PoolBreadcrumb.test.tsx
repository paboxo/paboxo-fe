import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PoolBreadcrumb } from './PoolBreadcrumb'

// The router's <Link> renders an <a>; that is all this component needs from it.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

describe('PoolBreadcrumb', () => {
  it('links back to the destination and names it', () => {
    render(<PoolBreadcrumb to="/earn" label="Earn" current="pxWHSK · pxUSDT" />)
    const link = screen.getByRole('link', { name: 'Earn' })
    expect(link.getAttribute('href')).toBe('/earn')
  })

  it('renders the current pool as inert text with aria-current="page"', () => {
    render(<PoolBreadcrumb to="/earn" label="Earn" current="pxWHSK · pxUSDT" />)
    const current = screen.getByText('pxWHSK · pxUSDT')
    expect(current.getAttribute('aria-current')).toBe('page')
    expect(current.closest('a')).toBeNull()
  })

  it('keeps the chevron out of the accessible name', () => {
    render(<PoolBreadcrumb to="/borrow" label="Borrow" current="pxWBTC" />)
    // If the chevron leaked, the name would be "‹ Borrow".
    expect(screen.getByRole('link', { name: 'Borrow' })).toBeTruthy()
    const chevron = screen.getByText('‹')
    expect(chevron.getAttribute('aria-hidden')).toBe('true')
  })

  it('omits the current segment while the pool is still loading', () => {
    render(<PoolBreadcrumb to="/earn" label="Earn" />)
    expect(screen.getByRole('link', { name: 'Earn' })).toBeTruthy()
    expect(document.querySelector('[aria-current]')).toBeNull()
  })

  it('labels the nav landmark', () => {
    render(<PoolBreadcrumb to="/earn" label="Earn" current="pxWETH" />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy()
  })
})

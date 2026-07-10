import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PoolBreadcrumb } from './PoolBreadcrumb'

/**
 * The router's `<Link>` renders an `<a>` — and, when it considers itself active,
 * stamps `aria-current="page"` on it. `/earn` is a prefix of `/earn/$id`, so
 * without `activeOptions.exact` the back link would claim to be the current
 * page. This mock records the prop so a test can hold that line; it does not
 * simulate the stamping (that is the router's job, exercised in the browser).
 */
const linkProps: Array<Record<string, unknown>> = []
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    activeOptions,
    ...rest
  }: {
    to: string
    children: React.ReactNode
    activeOptions?: { exact?: boolean }
  }) => {
    linkProps.push({ to, activeOptions })
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    )
  },
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

  it('exactly one element claims to be the current page', () => {
    const { container } = render(
      <PoolBreadcrumb to="/earn" label="Earn" current="pxWETH" />,
    )
    const claims = container.querySelectorAll('[aria-current]')
    expect(claims).toHaveLength(1)
    expect(claims[0].textContent).toBe('pxWETH')
  })

  it('matches the back link exactly, so /earn does not light up on /earn/$id', () => {
    linkProps.length = 0
    render(<PoolBreadcrumb to="/earn" label="Earn" current="pxWETH" />)
    // Without this, the router stamps aria-current="page" on the back link,
    // because /earn is a prefix of the detail route.
    expect(linkProps[0].activeOptions).toEqual({ exact: true })
  })
})

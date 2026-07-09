import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { AppHeader } from './AppHeader'

// The header reads the active path and renders typed <Link>s; stub the router
// so the nav can be asserted without a full RouterProvider (the repo keeps
// route files thin and untested, so there is no router test harness).
const nav = vi.hoisted(() => ({ pathname: '/earn' }))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname: nav.pathname } }),
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

function renderHeader(pathname: string) {
  nav.pathname = pathname
  return render(
    <DensityProvider>
      <AppHeader />
    </DensityProvider>,
  )
}

// Covers R1.
describe('AppHeader nav', () => {
  it('renders exactly Earn / Borrow / Swap / Portfolio and drops Markets/Dashboard', () => {
    renderHeader('/earn')
    expect(screen.getByRole('link', { name: 'Earn' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Borrow' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Swap' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Portfolio' })).toBeTruthy()
    // The removed intent-first surfaces are gone from the nav.
    expect(screen.queryByRole('link', { name: 'Markets' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
  })

  it('marks the active plane from the current path, including per-pool pages', () => {
    renderHeader('/borrow/pxwhsk')
    expect(screen.getByRole('link', { name: 'Borrow' }).className).toContain(
      'is-active',
    )
    expect(screen.getByRole('link', { name: 'Earn' }).className).not.toContain(
      'is-active',
    )
    expect(screen.getByRole('link', { name: 'Swap' }).className).not.toContain(
      'is-active',
    )
    expect(
      screen.getByRole('link', { name: 'Portfolio' }).className,
    ).not.toContain('is-active')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AppShell } from './AppShell'

// The shell's contract is structural. Its children pull in the router and the
// wallet, neither of which this test is about.
vi.mock('./AppHeader', () => ({
  AppHeader: () => <header data-testid="header" />,
}))
vi.mock('#/components/Footer', () => ({
  default: () => <footer data-testid="footer" />,
}))

describe('AppShell', () => {
  it('renders header, content, and footer as siblings of one full-height column', () => {
    const { container } = render(
      <AppShell>
        <main data-testid="main" />
      </AppShell>,
    )
    const shell = container.querySelector('[data-app-shell]')
    expect(shell).toBeTruthy()

    // jsdom does not lay out, so assert the class contract that produces the
    // sticky footer rather than a computed height. `.app-frame` provides the
    // full-height framing (fixed inset) that `min-h-dvh` used to.
    expect(shell?.className).toContain('app-frame')
    expect(shell?.className).toContain('flex')
    expect(shell?.className).toContain('flex-col')

    const children = Array.from(shell?.children ?? [])
    expect(children).toHaveLength(3)
    expect(children[0].tagName).toBe('HEADER')
    expect(children[2].tagName).toBe('FOOTER')
  })

  it('gives the content wrapper flex-1 so it absorbs the leftover height', () => {
    const { container } = render(
      <AppShell>
        <main data-testid="main" />
      </AppShell>,
    )
    const shell = container.querySelector('[data-app-shell]')
    const content = shell?.children[1]
    expect(content?.className).toContain('flex-1')
    expect(content?.querySelector('[data-testid="main"]')).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppPageHeader } from './AppPageHeader'

describe('AppPageHeader', () => {
  it('renders the title as an h1 and the subtitle when provided', () => {
    render(<AppPageHeader title="Earn on your pxUSDT" subtitle="Supply." />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe('Earn on your pxUSDT')
    expect(screen.getByText('Supply.')).toBeTruthy()
  })

  it('omits the kicker when not provided', () => {
    const { container } = render(<AppPageHeader title="Swap Tokens" />)
    expect(container.querySelector('.island-kicker')).toBeNull()
  })
})

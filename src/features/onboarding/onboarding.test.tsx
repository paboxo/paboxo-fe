import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Tooltip } from '#/components/ui/Tooltip'
import { TERMS } from '#/lib/copy/terms'
import { FirstRun } from './components/FirstRun'

describe('Tooltip', () => {
  it('shows the definition on focus and hides it on Escape', () => {
    render(<Tooltip term="Health factor" definition={TERMS['Health factor']} />)
    const trigger = screen.getByRole('button', { name: /Health factor/ })
    fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip').textContent).toMatch(/can be liquidated/)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

describe('FirstRun', () => {
  it('teaches the three verbs once and remembers dismissal', () => {
    window.localStorage.removeItem('paboxo:seen-intro')
    const { unmount } = render(<FirstRun />)
    expect(screen.getByText('Welcome to Paboxo')).toBeTruthy()
    fireEvent.click(screen.getByText('Got it'))
    expect(screen.queryByText('Welcome to Paboxo')).toBeNull()

    unmount()
    render(<FirstRun />)
    expect(screen.queryByText('Welcome to Paboxo')).toBeNull()
  })
})

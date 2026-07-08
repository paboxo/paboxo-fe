import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LoadingCard } from './Loading'
import { EmptyState } from './EmptyState'
import { DegradedNotice, ErrorState } from './ErrorState'

describe('display states', () => {
  it('LoadingCard announces a busy status', () => {
    render(<LoadingCard />)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-busy')).toBe('true')
  })

  it('EmptyState teaches and offers a next action', () => {
    render(
      <EmptyState
        title="Put your assets to work"
        description="Earn yield by supplying."
        action={<button type="button">Supply an asset</button>}
      />,
    )
    expect(screen.getByText('Put your assets to work')).toBeTruthy()
    expect(screen.getByText('Supply an asset')).toBeTruthy()
  })

  it('ErrorState offers a retry that fires the handler', () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Could not load markets." onRetry={onRetry} />)
    fireEvent.click(screen.getByText('Retry'))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('DegradedNotice is a non-blocking status, not an alert', () => {
    render(<DegradedNotice />)
    const notice = screen.getByRole('status')
    expect(notice.textContent).toMatch(/still work/)
  })
})

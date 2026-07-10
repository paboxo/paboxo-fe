import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when everything fits one page', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onPageChange={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('exposes the current page and total, marking the indicator aria-current', () => {
    render(<Pagination page={2} pageCount={5} onPageChange={vi.fn()} />)
    const indicator = screen.getByText('Page 2 of 5')
    expect(indicator.getAttribute('aria-current')).toBe('page')
    // The nav wrapper carries an accessible name.
    expect(screen.getByRole('navigation').getAttribute('aria-label')).toBe(
      'Pagination',
    )
  })

  it('disables prev on the first page and next on the last page', () => {
    const { rerender } = render(
      <Pagination page={1} pageCount={3} onPageChange={vi.fn()} />,
    )
    expect(
      screen.getByRole('button', { name: /previous page/i }),
    ).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: /next page/i })).toHaveProperty(
      'disabled',
      false,
    )

    rerender(<Pagination page={3} pageCount={3} onPageChange={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: /previous page/i }),
    ).toHaveProperty('disabled', false)
    expect(screen.getByRole('button', { name: /next page/i })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('calls onPageChange with the neighbouring page', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageCount={4} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)
  })
})

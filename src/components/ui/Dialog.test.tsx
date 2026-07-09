import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Dialog } from './Dialog'

function setup(open = true) {
  const onOpenChange = vi.fn()
  render(
    <Dialog open={open} onOpenChange={onOpenChange} title="Select a token">
      <p>Body</p>
    </Dialog>,
  )
  return { onOpenChange }
}

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    setup(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the title and children when open', () => {
    setup(true)
    expect(screen.getByRole('dialog', { name: 'Select a token' })).toBeTruthy()
    expect(screen.getByText('Body')).toBeTruthy()
  })

  it('closes on Escape', () => {
    const { onOpenChange } = setup(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes when the backdrop is clicked', () => {
    const { onOpenChange } = setup(true)
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on the close button', () => {
    const { onOpenChange } = setup(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

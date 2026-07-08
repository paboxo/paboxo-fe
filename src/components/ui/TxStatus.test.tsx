import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TxStatus } from './TxStatus'
import { ActionButton } from './ActionButton'

describe('TxStatus', () => {
  it('treats a wallet rejection as a soft, neutral note (not an error)', () => {
    render(<TxStatus state="rejected" />)
    const note = screen.getByText(/Signature cancelled/)
    expect(note.getAttribute('role')).toBe('status')
    expect(note.getAttribute('data-tone')).toBe('neutral')
  })

  it('shows a plain-language revert reason with raw error behind Details', () => {
    render(
      <TxStatus
        state="reverted"
        revert={{ message: 'Try a smaller amount.', raw: '0x1a2b' }}
      />,
    )
    expect(screen.getByText('Try a smaller amount.')).toBeTruthy()
    expect(screen.getByText('Details')).toBeTruthy()
    expect(screen.getByText('0x1a2b')).toBeTruthy()
  })
})

describe('ActionButton', () => {
  it('mutates its label and disables while busy', () => {
    const { rerender } = render(
      <ActionButton state="idle" idleLabel="Supply" />,
    )
    expect(screen.getByRole('button').textContent).toContain('Supply')
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false)

    rerender(<ActionButton state="pending" idleLabel="Supply" />)
    const btn = screen.getByRole('button')
    expect(btn.textContent).toContain('Confirming')
    expect(btn.hasAttribute('disabled')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastProvider'

function Trigger({ title }: { title: string }) {
  const toast = useToast()
  return (
    <button type="button" onClick={() => toast({ tone: 'positive', title })}>
      fire
    </button>
  )
}

describe('ToastProvider', () => {
  it('renders a toast when useToast() is called', () => {
    render(
      <ToastProvider>
        <Trigger title="Saved" />
      </ToastProvider>,
    )
    expect(screen.queryByText('Saved')).toBeNull()
    act(() => {
      screen.getByRole('button', { name: 'fire' }).click()
    })
    expect(screen.getByText('Saved')).not.toBeNull()
  })

  it('useToast() outside a provider is a safe no-op', () => {
    // No provider — must not throw when fired.
    expect(() =>
      render(<Trigger title="orphan" />),
    ).not.toThrow()
  })
})

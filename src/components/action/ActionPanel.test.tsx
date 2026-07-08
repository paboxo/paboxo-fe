import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ActionPanel } from './ActionPanel'

function typeAmount(amount: string) {
  fireEvent.change(screen.getByLabelText('Amount'), {
    target: { value: amount },
  })
}

describe('ActionPanel', () => {
  it('blocks submit and surfaces the reason when pre-flight fails', () => {
    render(
      <ActionPanel
        title="Borrow pxUSDT"
        idleLabel="Borrow"
        symbol="pxUSDT"
        decimals={6}
        maxTokens={1000}
        preflight={() => ({ enabled: false, reason: 'Not enough liquidity' })}
        onSubmit={() => {}}
      />,
    )
    typeAmount('100')
    expect(screen.getByText('Not enough liquidity')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Borrow/ }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('requires an acknowledgement when the projection is at-risk, then submits', () => {
    const onSubmit = vi.fn()
    render(
      <ActionPanel
        title="Borrow pxUSDT"
        idleLabel="Borrow"
        symbol="pxUSDT"
        decimals={6}
        maxTokens={1000}
        currentHf={2.41}
        projectHf={() => 1.15}
        onSubmit={onSubmit}
      />,
    )
    typeAmount('100')
    const submit = screen.getByRole('button', { name: /Borrow/ })
    expect(submit.hasAttribute('disabled')).toBe(true)

    fireEvent.click(screen.getByRole('checkbox'))
    expect(submit.hasAttribute('disabled')).toBe(false)

    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledWith(100)
  })
})

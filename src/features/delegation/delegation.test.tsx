import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ApprovalsManager } from '#/components/ui/ApprovalsManager'
import type { Allowance } from '#/components/ui/ApprovalsManager'
import { DelegationFlow } from '#/components/ui/DelegationFlow'

const allowance: Allowance = {
  id: 'a1',
  token: 'pxUSDT',
  spender: '0x9a4C',
  spenderLabel: 'LendingPool',
  amount: '500',
}

describe('ApprovalsManager', () => {
  it('lists an allowance and revokes it', () => {
    const onRevoke = vi.fn()
    render(<ApprovalsManager allowances={[allowance]} onRevoke={onRevoke} />)
    expect(screen.getByText(/LendingPool/)).toBeTruthy()
    fireEvent.click(screen.getByText('Revoke'))
    expect(onRevoke).toHaveBeenCalledWith('a1')
  })
})

describe('DelegationFlow', () => {
  it('restates the consequence and gates on explicit confirmation', () => {
    const onConfirm = vi.fn()
    render(
      <DelegationFlow
        delegate="0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A"
        asset="pxUSDT"
        cap="1,000"
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText(/collateral is at risk/i)).toBeTruthy()
    const grant = screen.getByRole('button', { name: /Grant delegation/ })
    expect(grant.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(grant.hasAttribute('disabled')).toBe(false)
    fireEvent.click(grant)
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})

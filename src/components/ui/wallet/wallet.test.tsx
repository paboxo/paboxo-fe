import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConnectPrompt } from './ConnectPrompt'
import { NetworkBanner } from './NetworkBanner'
import { AccountPill, truncateAddress } from './AccountPill'

describe('wallet presentation', () => {
  it('ConnectPrompt gates an action and fires connect', () => {
    const onConnect = vi.fn()
    render(<ConnectPrompt action="supply" onConnect={onConnect} />)
    expect(screen.getByText(/Connect a wallet to supply/)).toBeTruthy()
    fireEvent.click(screen.getByText('Connect'))
    expect(onConnect).toHaveBeenCalledOnce()
  })

  it('NetworkBanner alerts and fires the injected switch', () => {
    const onSwitch = vi.fn()
    render(<NetworkBanner currentChainName="Base" onSwitch={onSwitch} />)
    const banner = screen.getByRole('alert')
    expect(banner.textContent).toMatch(/on Base/)
    fireEvent.click(screen.getByText('Switch'))
    expect(onSwitch).toHaveBeenCalledOnce()
  })

  it('AccountPill truncates the address', () => {
    expect(truncateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A')).toBe(
      '0x742d…9f3A',
    )
    render(
      <AccountPill
        address="0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A"
        chainName="HashKey"
      />,
    )
    expect(screen.getByText('0x742d…9f3A')).toBeTruthy()
  })
})

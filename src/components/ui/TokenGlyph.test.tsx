// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { TokenGlyph } from './TokenGlyph'
import { TokenPairGlyph } from './TokenPairGlyph'
import { getTokenByAddress } from '#/lib/tokens/registry'

const PXWETH = '0x46638aD472507482B7D5ba45124E93D16bc97eCE' as const
const PXUSDT = '0x4852Bc014401415C4CE4788A04cAB019d1527aAa' as const
// Two contracts that BOTH return "pxWHSK" from symbol() on-chain.
const PXWHSK_XC = '0x7c9cF703903680ae5EB6ec2Bb2BEbb1ec751918A' as const
const PXWHSK_MARKET = '0xc3be8ab4CA0cefE3119A765b324bBDF54a16A65b' as const

describe('TokenGlyph', () => {
  it('renders the registry logo as an <img> when a known address is passed', () => {
    const { container } = render(
      <TokenGlyph symbol="pxWETH" address={PXWETH} />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    const expected = getTokenByAddress(PXWETH)!.logo
    expect(img!.getAttribute('src')).toBe(expected)
    expect(expected).toBe('/tokens/weth.webp')
  })

  it('renders the logo as decorative (empty alt, aria-hidden, no accessible name)', () => {
    const { container, queryByRole } = render(
      <TokenGlyph symbol="pxWETH" address={PXWETH} />,
    )
    // An empty-alt image exposes no accessible name / img role.
    expect(queryByRole('img')).toBeNull()
    const img = container.querySelector('img')!
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('aria-hidden')).toBe('true')
  })

  it('gives the logo the circular clip and the 1.5px cutout border', () => {
    const { container } = render(
      <TokenGlyph symbol="pxWETH" address={PXWETH} />,
    )
    const img = container.querySelector('img')!
    expect(img.style.borderRadius).toBe('9999px')
    expect(img.style.border).toBe('1.5px solid var(--surface-strong)')
    expect(img.style.objectFit).toBe('cover')
  })

  it('falls back to the initials circle when no address is given', () => {
    const { container } = render(<TokenGlyph symbol="pxWETH" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('WET')
  })

  it('falls back to the initials circle for an address the registry does not know', () => {
    const unknown = '0x0000000000000000000000000000000000000000' as const
    const { container } = render(
      <TokenGlyph symbol="pxWETH" address={unknown} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('WET')
  })
})

describe('TokenPairGlyph', () => {
  it('renders two logos for a known pair with collateral stacked in front', () => {
    const { container } = render(
      <TokenPairGlyph
        collateralSymbol="pxWETH"
        borrowSymbol="pxUSDT"
        collateralAddress={PXWETH}
        borrowAddress={PXUSDT}
      />,
    )
    const imgs = container.querySelectorAll('img')
    expect(imgs).toHaveLength(2)
    // The collateral glyph renders first and sits in the z-10 wrapper.
    const frontWrapper = container.querySelector('.z-10')
    expect(frontWrapper).not.toBeNull()
    expect(frontWrapper!.querySelector('img')!.getAttribute('src')).toBe(
      getTokenByAddress(PXWETH)!.logo,
    )
    // First image in DOM order is the collateral (front) token.
    expect(imgs[0].getAttribute('src')).toBe(getTokenByAddress(PXWETH)!.logo)
  })

  it('distinguishes cross-chain pxWHSK from market pxWHSK by address', () => {
    const { container: xc } = render(
      <TokenGlyph symbol="pxWHSK" address={PXWHSK_XC} />,
    )
    const { container: market } = render(
      <TokenGlyph symbol="pxWHSK" address={PXWHSK_MARKET} />,
    )
    const xcSrc = xc.querySelector('img')!.getAttribute('src')
    const marketSrc = market.querySelector('img')!.getAttribute('src')
    expect(xcSrc).not.toBe(marketSrc)
    expect(xcSrc).toBe('/tokens/whsx-xc.webp')
    expect(marketSrc).toBe('/tokens/whsx.webp')
  })
})

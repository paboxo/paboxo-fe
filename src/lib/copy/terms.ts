/**
 * Plain-language glossary for risk terms (U18, R30). Every technical term stays
 * visible with a one-sentence definition one tap/focus away.
 */
export const TERMS: Record<string, string> = {
  'Health factor':
    'How safe your position is. If it falls to 1.0, your collateral can be liquidated.',
  Liquidation:
    'When your collateral is sold to cover your loan because your position got too risky.',
  LLTV: 'The most you can borrow against collateral before liquidation risk begins.',
  Utilization: 'How much of a pool’s supplied liquidity is currently borrowed.',
  APY: 'Yearly rate, compounding.',
  'Supply APY': 'The yearly rate you earn for supplying to a pool.',
  'Borrow APR': 'The yearly rate you pay on what you borrow.',
  Slippage:
    'The most price movement you’ll accept on a swap before it cancels.',
  Delegation:
    'Letting another address borrow against your collateral — at your risk.',
}

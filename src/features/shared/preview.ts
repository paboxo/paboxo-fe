import type { Address } from '#/lib/contracts'

/** The address user-scoped hooks read in mock mode. The mock adapters ignore
 *  it; live mode (U18/U19) passes the connected wallet address instead. */
export const PREVIEW_ADDRESS: Address =
  '0x0000000000000000000000000000000000000001'

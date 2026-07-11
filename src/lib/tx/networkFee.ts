/**
 * Estimated on-chain fee for a pool action, shown in the review block. Rather
 * than a made-up USD figure, this is `gas x gasPrice` in the native token (HSK).
 *
 * HashKey's gas price is effectively pinned to its floor, and a legacy write
 * sends 1.5x that floor (see `writeWithGas` in the chain adapter); a typical pool
 * action costs on the order of 200k gas (observed: ~150k). So the fee is a small,
 * stable HSK amount — honest about how cheap gas is here.
 */
const GAS_PRICE_WEI = 1_500_000n // MIN_GAS_PRICE (1e6 floor) x the 1.5x buffer
const TYPICAL_GAS = 200_000n
const WEI_PER_HSK = 1e18

/** Estimated network fee for a pool action, in HSK. */
export const NETWORK_FEE_HSK = Number(TYPICAL_GAS * GAS_PRICE_WEI) / WEI_PER_HSK

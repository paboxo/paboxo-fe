/**
 * Live Paboxo addresses on HashKey Chain mainnet (177).
 * Source of truth: references/paboxo-sc/docs/DEPLOYMENT.md (verify on explorer.hsk.xyz).
 * These are injected config — a redeploy is a config swap, not a code edit.
 */
import type { Address } from './chains'

export interface CoreAddresses {
  lendingPoolFactory: Address
  tokenDataStream: Address
  isHealthy: Address
  interestRateModel: Address
  paboxoEmitter: Address
  ccipReceiver: Address
  ccipRouter: Address
  owner: Address
}

export const CORE: CoreAddresses = {
  lendingPoolFactory: '0xF0D1c69cc148db2437131a5A736d77FD6fa20B47',
  tokenDataStream: '0x007F735Fd070DeD4B0B58D430c392Ff0190eC20F',
  isHealthy: '0xb3B458299864487520d3B0cEDf9F5cfF2629a27B',
  interestRateModel: '0x175867CAF278eB0610F216F3E0a6E671f2382E22',
  paboxoEmitter: '0x290CAcb1bc6e35797Db6243a1C10C12F16d93370',
  ccipReceiver: '0x8ab3650f02603C97dE6DeAFF927041fC536366Ae',
  ccipRouter: '0xf2Fd62c083F3BF324e99ce157D1a42d7EbA77f1d',
  owner: '0x0EcE75f3C36f7Df2136Dac7633165DBff53dE3CD',
}

/**
 * Not fixed addresses (do not invent):
 * - Each market's accounting `router` = `LendingPool(pool).router()`, resolved
 *   at runtime (two-address rule: writes -> pool, state reads -> router).
 * - `HelperUtils` (getMaxBorrowAmount / getCollateralValue / getAddressPosition
 *   / isLiquidatable) is discovered via the factory / broadcast logs.
 */
export const HELPER_UTILS: Address | undefined = undefined

export interface TokenInfo {
  address: Address
  decimals: number
}

export type TokenSymbol = 'pxUSDT' | 'pxWHSK' | 'pxWBTC' | 'pxWETH'

export const TOKENS: Record<TokenSymbol, TokenInfo> = {
  pxUSDT: {
    address: '0x4852Bc014401415C4CE4788A04cAB019d1527aAa',
    decimals: 6,
  },
  pxWHSK: {
    address: '0xc3be8ab4CA0cefE3119A765b324bBDF54a16A65b',
    decimals: 18,
  },
  pxWBTC: {
    address: '0x718b1b67f287571767452CC7d24BCD95c63DbA13',
    decimals: 8,
  },
  pxWETH: {
    address: '0x46638aD472507482B7D5ba45124E93D16bc97eCE',
    decimals: 18,
  },
}

/** The canonical token symbol list — the one place to iterate every known token. */
export const TOKEN_SYMBOLS = Object.keys(TOKENS) as TokenSymbol[]

export interface FeedInfo {
  address: Address
  type: 'constant' | 'push'
  seedUsd: number
}

/** TokenDataStream feeds (8-dp USD). Push feeds are moved by the backend keeper. */
export const PRICE_FEEDS: Record<string, FeedInfo> = {
  pxUSDT: {
    address: '0xB9B3A1baA8CF4C5Cd6b4d132eD7B0cBe05646f6f',
    type: 'constant',
    seedUsd: 1,
  },
  pxWHSK: {
    address: '0x54f6Ff27093FC45c5A39083C3Ef0260D25012Be3',
    type: 'push',
    seedUsd: 0.05,
  },
  pxWBTC: {
    address: '0xec32CC0267002618c339274C18AD48D2Bf2A9c7e',
    type: 'push',
    seedUsd: 60000,
  },
  pxWETH: {
    address: '0x3870bFD5820994a560E3F1D9c98c7740D9E007B8',
    type: 'push',
    seedUsd: 3000,
  },
  'pxWHSK-xchain': {
    address: '0x64493Bd2F250cC05D75bCa93cc95447e2834638b',
    type: 'push',
    seedUsd: 0.05,
  },
}

export interface CrossChainAddresses {
  /** Paboxo's own Burn&Mint bridge token (pxWHSK) — a different contract per chain. */
  bridgeToken: { hashkey: Address; base: Address }
  burnMintTokenPool: { hashkey: Address; base: Address }
  /** Base-side sender: user calls supplyToHashKey / quote here to supply cross-chain. */
  baseSender: Address
  /** True once the Base sender is deployed AND allowlisted on the HashKey receiver. */
  baseSenderDeployed: boolean
}

export const CROSS_CHAIN: CrossChainAddresses = {
  bridgeToken: {
    hashkey: '0x7c9cF703903680ae5EB6ec2Bb2BEbb1ec751918A',
    base: '0x40242415B6021e0CaA2e33D9a220aE5Da073549B',
  },
  burnMintTokenPool: {
    hashkey: '0x5e6671ef689B2B2D4391a766B0486E5054136546',
    base: '0x1b0C8546E6DECB3C1c6cc8c20E69E23407dAd601',
  },
  // Owner = deployer (authority model). Sender allowlisted on receiver 0x8ab3…66Ae.
  baseSender: '0x54d50F364Da0c1C913B433299b3Ae6D1cD7D356A',
  baseSenderDeployed: true,
}

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
  /** Paboxo's own Burn&Mint bridge token (pxWHSK) — a different contract per chain. Cross-chain SUPPLY. */
  bridgeToken: { hashkey: Address; base: Address }
  burnMintTokenPool: { hashkey: Address; base: Address }
  /** Base-side sender: user calls supplyToHashKey / quote here to supply cross-chain. */
  baseSender: Address
  /** True once the Base sender is deployed AND allowlisted on the HashKey receiver. */
  baseSenderDeployed: boolean
  /**
   * Cross-chain BORROW rail: the borrow asset (pxUSDT) now has a CCIP burn&mint pool on both chains, so
   * `LendingPool.borrow` with `chainId=8453` bridges the borrowed pxUSDT to the user's EOA on Base.
   * `hashkey` = the market borrow asset; `base` = its bridged counterpart minted on Base.
   */
  borrowBridge: {
    token: { hashkey: Address; base: Address }
    burnMintTokenPool: { hashkey: Address; base: Address }
    enabled: boolean
  }
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
  // Cross-chain borrow rail (pxUSDT), live 2026-07-10. Lane HashKey↔Base wired both ways.
  borrowBridge: {
    token: {
      hashkey: '0x4852Bc014401415C4CE4788A04cAB019d1527aAa',
      base: '0xB428c1FeB0208DbF4184aC7a788c4ba8a1daB314',
    },
    burnMintTokenPool: {
      hashkey: '0xfaDe11Ae9d9365D7892BEDa4e23975937307c178',
      base: '0x4224CdF58ECFA22b3b628965149FcB997E1aFC77',
    },
    enabled: true,
  },
}

/** The zero address — an unset placeholder in the protection config. */
const ZERO: Address = '0x0000000000000000000000000000000000000000'

/**
 * AI "agent protection" config (HSP-gated). The user pays a small stablecoin
 * fee via HSP; on ACCEPT the FE grants rebalance-delegation to `agentKeeper`, so
 * the keeper may `rebalancePosition` to protect the position. Injected config —
 * the keeper/treasury are set once the real wallets exist (a config swap, not a
 * code edit), guarded by `PROTECTION_UNCONFIGURED` until then.
 */
export interface ProtectionConfig {
  /** AI rebalance keeper that receives rebalance-delegation. TODO: set to the real keeper wallet. */
  agentKeeper: Address
  /** Fee recipient — the buyback / fee-sink wallet. TODO: set to the real treasury. */
  feeTreasury: Address
  /** Stablecoin the protection fee is paid in. */
  feeToken: Address
  /** Fee amount in feeToken base units. */
  feeAmount: bigint
}

export const PROTECTION: ProtectionConfig = {
  agentKeeper: '0x1840A5a5AE7D0F70674C434f3BFf4a7e529c9F0b', // REBALANCE_KEEPER / AGENT_ADDRESS (keeper docs AI-REBALANCE-FRONTEND.md §delegasi)
  feeTreasury: '0x63b9679e3A253920161B51A79D122EAad1c19baF', // buyback / fee-sink wallet
  // USDC.e on HashKey mainnet 177 — the HSP-pinned stablecoin. In hsp mode the
  // real payment moves this token (HSP pay() uses the chain-pinned stablecoin);
  // mock mode just uses it for the fee label. Display metadata: tokens/registry.ts.
  feeToken: '0x054ed45810DbBAb8B27668922D110669c9D88D0a',
  feeAmount: 1_000_000n, // 1 USDC.e (6dp) demo fee
}

/** True until both the keeper and treasury wallets are set — the UI/hook guard. */
export const PROTECTION_UNCONFIGURED = (c: ProtectionConfig): boolean =>
  c.agentKeeper === ZERO || c.feeTreasury === ZERO

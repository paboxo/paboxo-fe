/**
 * Chain guard (U9, R16). Every write must run on its required chain (177 for
 * same-chain actions, 8453/Base for the CCIP path). This asks the wallet to
 * switch when it is on the wrong one; the switch itself can be user-rejected.
 */

/** Ensure the wallet is on `required`, requesting a switch if not. */
export async function ensureChain(
  current: number | undefined,
  required: number,
  switchChain: (chainId: number) => Promise<unknown>,
): Promise<void> {
  if (current === required) return
  await switchChain(required)
}

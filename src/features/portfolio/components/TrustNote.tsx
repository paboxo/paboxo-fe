/**
 * Trust reassurances for agent protection (R12). The three promises the guide
 * says to make explicit: funds never leave the position, protection is
 * revocable anytime, and the LLM is advisory (the math is deterministic
 * on-chain).
 */
export function TrustNote() {
  return (
    <section
      className="island-shell flex flex-col gap-2 rounded-2xl p-5"
      aria-label="How agent protection keeps your funds safe"
    >
      <h3 className="display-title m-0 text-base font-semibold">
        Your funds stay yours
      </h3>
      <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[0.82rem] text-[var(--sea-ink-soft)]">
        <li>
          The agent only rebalances <strong>inside</strong> your position —
          funds never leave it.
        </li>
        <li>
          You can <strong>revoke</strong> protection anytime; it takes one
          transaction.
        </li>
        <li>
          The AI only writes the explanation — every number is deterministic
          on-chain math.
        </li>
      </ul>
    </section>
  )
}

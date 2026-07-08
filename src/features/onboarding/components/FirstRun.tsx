import { useEffect, useState } from 'react'

const KEY = 'paboxo:seen-intro'

/**
 * First-run teaching (U18, R29). Shows once, teaches the three verbs, and is
 * dismissible; read-only browsing is itself the rest of the onboarding.
 */
export function FirstRun() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setShow(true)
    } catch {
      /* storage unavailable — skip the intro rather than block */
    }
  }, [])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try {
      window.localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Welcome to Paboxo"
      className="island-shell flex flex-col gap-3 rounded-2xl p-5"
    >
      <h3 className="display-title m-0 text-lg font-semibold text-[var(--sea-ink)]">
        Welcome to Paboxo
      </h3>
      <ul className="m-0 flex flex-col gap-1.5 pl-4 text-[0.9rem] text-[var(--sea-ink)]">
        <li>
          <b>Supply</b> your assets to earn yield.
        </li>
        <li>
          <b>Borrow</b> against what you supply.
        </li>
        <li>
          <b>Health</b> keeps you safe — keep it above 1.
        </li>
      </ul>
      <p className="m-0 text-[0.78rem] text-[var(--sea-ink-soft)]">
        Take your time — nothing happens until you confirm in your wallet.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="self-start rounded-xl px-4 py-2 text-sm font-bold"
        style={{ background: 'var(--palm)', color: '#f3faf5' }}
      >
        Got it
      </button>
    </div>
  )
}

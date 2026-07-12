import { useCallback, useEffect, useState } from 'react'
import type { CrossChainTransfer } from '#/components/ui/CrossChainTracker'

/** Namespaced per feature so a supply and a borrow transfer never collide in one
 *  slot (they run on the same device at once). */
const keyFor = (feature: string) => `paboxo:crosschain:${feature}`

/** Persist so an in-flight transfer survives navigation and reload (U14, R25). */
export function loadTransfer(feature: string): CrossChainTransfer | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(keyFor(feature))
    return raw ? (JSON.parse(raw) as CrossChainTransfer) : null
  } catch {
    return null
  }
}

export function saveTransfer(
  feature: string,
  transfer: CrossChainTransfer | null,
): void {
  if (typeof window === 'undefined') return
  try {
    if (transfer)
      window.localStorage.setItem(keyFor(feature), JSON.stringify(transfer))
    else window.localStorage.removeItem(keyFor(feature))
  } catch {
    /* storage unavailable */
  }
}

export function useCrossChainTransfer(feature: string) {
  const [transfer, setTransfer] = useState<CrossChainTransfer | null>(null)

  useEffect(() => {
    setTransfer(loadTransfer(feature))
  }, [feature])

  const start = useCallback(
    (next: CrossChainTransfer) => {
      setTransfer(next)
      saveTransfer(feature, next)
    },
    [feature],
  )

  const update = useCallback(
    (patch: Partial<CrossChainTransfer>) => {
      setTransfer((prev) => {
        if (!prev) return prev
        const next = { ...prev, ...patch }
        saveTransfer(feature, next)
        return next
      })
    },
    [feature],
  )

  const clear = useCallback(() => {
    setTransfer(null)
    saveTransfer(feature, null)
  }, [feature])

  return { transfer, start, update, clear }
}

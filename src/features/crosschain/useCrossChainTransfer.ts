import { useCallback, useEffect, useState } from 'react'
import type { CrossChainTransfer } from '#/components/ui/CrossChainTracker'

const KEY = 'paboxo:crosschain'

/** Persist so an in-flight transfer survives navigation and reload (U14, R25). */
export function loadTransfer(): CrossChainTransfer | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CrossChainTransfer) : null
  } catch {
    return null
  }
}

export function saveTransfer(transfer: CrossChainTransfer | null): void {
  if (typeof window === 'undefined') return
  try {
    if (transfer) window.localStorage.setItem(KEY, JSON.stringify(transfer))
    else window.localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}

export function useCrossChainTransfer() {
  const [transfer, setTransfer] = useState<CrossChainTransfer | null>(null)

  useEffect(() => {
    setTransfer(loadTransfer())
  }, [])

  const start = useCallback((next: CrossChainTransfer) => {
    setTransfer(next)
    saveTransfer(next)
  }, [])

  const update = useCallback((patch: Partial<CrossChainTransfer>) => {
    setTransfer((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveTransfer(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setTransfer(null)
    saveTransfer(null)
  }, [])

  return { transfer, start, update, clear }
}

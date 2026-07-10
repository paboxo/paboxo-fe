import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { TxToast } from './TxToast'
import type { ToastTone } from './TxToast'

export interface ToastInput {
  tone?: ToastTone
  title: string
}

type ShowToast = (toast: ToastInput) => void

/** Default is a no-op so `useToast()` is safe outside a provider (tests, SSR). */
const ToastContext = createContext<ShowToast>(() => {})

/** Imperative toast trigger — fire from write hooks on success/failure. */
export const useToast = (): ShowToast => useContext(ToastContext)

interface ActiveToast extends ToastInput {
  id: number
}

const TOAST_TTL_MS = 5000

/**
 * Owns the toast queue and lifecycle (the host `TxToast`'s comment defers to).
 * Renders a fixed, screen-reader-announced stack and auto-dismisses each toast.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([])
  const seq = useRef(0)

  const show = useCallback<ShowToast>((toast) => {
    seq.current += 1
    const id = seq.current
    setToasts((current) => [...current, { ...toast, id }])
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, TOAST_TTL_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        aria-live="polite"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <TxToast key={toast.id} tone={toast.tone} title={toast.title} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

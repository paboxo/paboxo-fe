import { useId } from 'react'

/**
 * The pool-list search box (U7, R12, R13). A controlled input that carries an
 * explicit accessible name and filters from the first keystroke — the parent
 * owns the query string and derives the filtered list synchronously, so there is
 * no debounce, no minimum length, and no timer here.
 */
export interface PoolSearchProps {
  value: string
  onChange: (value: string) => void
  /** Overridable placeholder / accessible name for the two surfaces. */
  label?: string
  placeholder?: string
}

export function PoolSearch({
  value,
  onChange,
  label = 'Search pools',
  placeholder = 'Search by token symbol or address',
}: PoolSearchProps) {
  const id = useId()
  return (
    <div className="max-w-md">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="demo-input text-sm"
      />
    </div>
  )
}

export interface ReviewRow {
  label: string
  value: string
}

/** The "your new position" review before signing (U10, R21). */
export function ReviewBlock({ rows }: { rows: ReviewRow[] }) {
  return (
    <dl
      className="m-0 flex flex-col gap-1 rounded-xl p-3"
      style={{
        background: 'color-mix(in oklab, var(--sand) 40%, transparent)',
      }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between text-[0.82rem]"
        >
          <dt className="text-[var(--sea-ink-soft)]">{row.label}</dt>
          <dd className="num m-0 font-semibold text-[var(--sea-ink)]">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

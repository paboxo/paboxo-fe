import { DATA_MODE } from '#/lib/config/env'

export default function Footer() {
  const dataLabel =
    DATA_MODE === 'live'
      ? 'live on HashKey Chain 177'
      : 'preview build · running on mock data'
  return (
    <footer className="border-t border-[var(--line)] px-4 pb-12 pt-8 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          &copy; 2026 Paboxo · money market on HashKey Chain
        </p>
        <p className="island-kicker m-0">{dataLabel}</p>
      </div>
    </footer>
  )
}

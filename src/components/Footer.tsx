export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-12 pt-8 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          &copy; 2026 Paboxo · money market on HashKey Chain
        </p>
        <p className="island-kicker m-0">
          Preview build · running on mock data
        </p>
      </div>
    </footer>
  )
}

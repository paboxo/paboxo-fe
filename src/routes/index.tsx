import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

const FEATURES: [string, string][] = [
  [
    'Simple or Pro',
    'A calm savings-style surface by default, with a one-tap Pro density for power users — same data, two depths.',
  ],
  [
    'Health you can read',
    'Risk shown as a buffer that empties toward danger, plus the exact price at which you’d be liquidated.',
  ],
  [
    'Calm by design',
    'Warm coastal glass, exact-amount approvals, and plain-language copy — every risky step tells you what happens next.',
  ],
]

function Home() {
  return (
    <main className="page-wrap px-4 pb-16 pt-12">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-10 sm:py-16">
        <p className="island-kicker mb-3">HashKey money market · preview</p>
        <h1 className="display-title mb-4 max-w-3xl text-4xl leading-[1.02] font-semibold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Earn and borrow, calmly.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Supply assets to earn yield, borrow pxUSDT against them, and always
          know exactly how safe your position is. Running on preview data while
          the on-chain wiring lands.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/markets"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-[#f3faf5] no-underline transition hover:-translate-y-0.5"
            style={{ background: 'var(--palm)' }}
          >
            Browse markets
          </a>
          <a
            href="/dashboard"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5"
          >
            Your dashboard
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(([title, desc], index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

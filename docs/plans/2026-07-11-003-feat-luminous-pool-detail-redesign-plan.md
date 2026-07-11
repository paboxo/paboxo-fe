---
title: Luminous Professional redesign — pool detail pages (/earn/$id, /borrow/$id)
date: 2026-07-11
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
type: feat
---

# Luminous Professional — Pool Detail Redesign

## Goal Capsule

Bring the two pool **detail** pages — `/earn/$id` (supply liquidity) and
`/borrow/$id` (borrow against collateral) — into visual parity with the
"Luminous Professional" design provided in `docs/ui/earn:pool/`
(`screen.png`, `code.html`, `DESIGN.md`). Only one design was provided (the
Earn detail); the Borrow detail is **improvised** from it because the two share
the same two-column shape. This is a **visual/layout redesign only** — all data
hooks, wallet gating (`NetworkGuard`), money-path behavior, and tx wiring stay
intact. Two intentional content changes, both in the left column: (1) R6's
removal of the liquidity chart card (a user decision) — the Utilization and TVL
tiles remain as the point-in-time liquidity signal, so the loss is the
historical depth trend, not the raw number; and (2) trimming the Earn stat strip
to the mockup's five tiles (dropping the Earn "Available" tile — KTD4; the Borrow
variant keeps it). Everything else is presentational.

The list/swap pages and the design tokens (`--palm` = `#0690d4`,
`--font-display` = Manrope, `--font-mono` = JetBrains Mono, `.app-frame`) were
already migrated to Luminous in a prior phase
(`docs/plans/2026-07-11-002-...`). This phase extends that system to the
detail-page surfaces that still carry the older styling.

## Actors

- **Lender / visitor** on `/earn/$id`: views pool economics; when connected,
  supplies or withdraws pxUSDT liquidity.
- **Borrower / visitor** on `/borrow/$id`: views pool economics; when
  connected, supplies collateral, borrows, repays, or withdraws collateral, and
  monitors position health.

Both pages already render pool data to unconnected visitors (left column is
wallet-independent); the right action card is wallet-gated.

## Scope Boundaries (non-goals)

- **No money-path or hook changes.** `useSupplyLiquidity`, `useWithdraw`,
  `useBorrow`, `useRepay`, `usePool`, `useMarketPosition`, oracle/router reads,
  `writeWithGas`, preflight gates — all unchanged.
- **No behavioral change to gating.** First-time-borrower CTA (supply collateral
  first), stale-price blocks (Supply/Borrow blocked, Withdraw not), and
  `NetworkGuard` connect prompts keep their current logic.
- **No new routes, no data model changes, no indexer/API work.**
- **Tabs stay the current pill style** (rounded-full, blue active) — the square
  segmented control from the mockup is intentionally *not* adopted (user
  decision).
- Not touching the list pages, swap page, or header — those already ship
  Luminous.

## Requirements

### Layout & shell

- **R1** — Both detail pages keep the two-column grid
  (`lg:grid-cols-[1.6fr_1fr]`): left = wallet-independent `PoolInfo`, right =
  wallet-gated action card (sticky on desktop). No structural change to
  `src/routes/earn.$id.tsx` / `src/routes/borrow.$id.tsx` beyond restyling.
- **R2** — All detail-page cards adopt the Luminous surface language: off-white
  card fill, 1px low-contrast border, small radius (8px cards / 4px
  inputs+buttons), no heavy shadows — consistent with the list/swap pages
  already shipped. Primary accent is `--palm` (`#0690d4`); primary buttons are
  solid blue with white text; numeric emphasis values render blue.
- **R3** — Typography follows the system already in tokens: Manrope for the
  pool title / big numbers, Inter for body/UI, JetBrains Mono (uppercase,
  letter-spaced) for stat labels and column-style metadata.
- **R4** — Breadcrumb, loading, not-found, and unavailable states on both pages
  are restyled to match (blue "‹ Earn/Borrow" back link, Luminous empty/error
  cards). Their logic and copy intent are unchanged.

### Left column — PoolInfo

- **R5** — The identity card shows the token-pair glyphs, the
  `collateral / borrow` pair title (Manrope), and the context subtitle, then a
  horizontal strip of stat tiles: **Supply APY** (blue, leads on Earn),
  **Utilization**, **{collateral} Price**, **Borrow APR**, **TVL**. The Borrow
  variant may reorder to lead with the risk metric (borrow APR) per the
  existing `context` prop, and keeps its own richer risk-tile set (LLTV, Liq.
  threshold) in the same grid and tile styling — same styling, not the same five
  tiles (see KTD4).
- **R6** — The left column renders exactly **two** chart cards: **Interest rate
  model** (IRM curve with the "Current NN%" marker + utilization badge) and
  **Rate history**. The **Liquidity chart card is removed** (user decision) —
  `MarketLiquidityChart` is dropped from `PoolInfo`.
- **R7** — Stale-price / size-unknown badges continue to render on the identity
  card when applicable, restyled to the Luminous badge treatment.

### Right column — action card

- **R8** — The action card restyles to Luminous: card container, pill tab row
  (blue active tab, e.g. Supply/Withdraw on Earn; Supply/Borrow/Repay/Withdraw
  on Borrow), a token-glyph action header, the amount input, the review summary
  block, and a full-width blue primary button.
- **R9 (slider — already implemented; restyle only)** — The percentage slider
  (0 / 25 / 50 / 75 / 100%) already ships as `AmountSlider`
  (`src/components/ui/AmountSlider.tsx`: native `input[type=range]`,
  keyboard-accessible, thumb reflects the current input value) and is already
  wired through `MoneyInput.onQuickFill` → `ActionPanel`. It therefore already
  renders between the amount input and the review block on every panel wherever
  a `maxTokens` basis exists, and hides when none does. **No new slider is
  built.** The only work is restyling it to the Luminous treatment (folded into
  R8) and verifying its states survive the restyle: two-way binding intact,
  focus ring visible, an adequate touch target on the narrow layout (AE5), and a
  screen-reader label / value on the range input.
- **R10** — The amount input area shows the balance/max context line
  ("Your Balance … {amount} {symbol}" on Earn supply; the appropriate
  "Supplied" / max basis on the other actions) and the `≈ $USD` line, styled per
  the mockup. The existing `maxLabel` semantics are preserved (e.g. "Supplied"
  for withdraw).
- **R11** — The review summary keeps its current rows (amount, APY where shown,
  network fee, and — on borrow actions — projected health / liquidation price),
  restyled to the Luminous detail block.

### Borrow-side position card

- **R12** — The "Your position" card on `/borrow/$id` (collateral, borrowed,
  health meter) is restyled to Luminous and sits above the action tabs in the
  right column, matching the improvised borrow layout. Its data
  (`useMarketPosition`) and the health-in-right-card placement are unchanged.

## Acceptance Examples

- **AE1** — Visiting `/earn/$id` while disconnected shows the redesigned left
  column (identity + stat strip + IRM + Rate history, **no** liquidity chart)
  and a `NetworkGuard` connect prompt in the right column, all in Luminous
  styling.
- **AE2** — Connected on `/earn/$id`, dragging the slider to 50% fills the
  supply input with half the wallet pxUSDT balance; the Supply button and tx
  flow behave exactly as before.
- **AE3** — On `/borrow/$id` with no collateral, the right column shows the
  restyled position card (zeros) and the "Supply collateral first" gate; after
  supplying, the Borrow/Repay/Withdraw tabs unlock — unchanged behavior, new
  look.
- **AE4** — A pool with a stale price still shows the stale badge on the left and
  still blocks Supply/Borrow (not Withdraw) — the restyle does not alter the
  gate.
- **AE5** — On a narrow viewport both pages collapse to a single column with the
  action card below `PoolInfo`; nothing overflows horizontally.

## Success Criteria

- Both detail pages visually match `docs/ui/earn:pool/` (Borrow adapted from the
  same design), consistent with the already-shipped list/swap pages.
- The full test suite stays green (currently 402/402); `tsc`, ESLint, and the
  Vite build pass; SSR renders 200.
- No diff to money-path modules, hooks, or gating logic — only presentational
  (restyle) changes; no functional slider addition (the slider already exists).

## Outstanding Questions (resolved during planning)

- **Q1 (shared vs page-local styling) — RESOLVED.** Research showed the
  detail-page components already consume the *same* Luminous token vocabulary
  (`island-shell`, `--palm`, `--sea-ink`, `--line`, `.display-title`, `.num`,
  `.amount-slider`) as the already-shipped list/swap pages — there is no
  separate legacy token set to migrate. The work is therefore a layout /
  spacing / emphasis alignment *inside* the detail-page components; no shared
  token or shared class changes, so list/swap pages are unaffected. See
  **KTD1**.

## Primary files (for planning, not prescriptive)

- Routes: `src/routes/earn.$id.tsx`, `src/routes/borrow.$id.tsx`
- Left column: `src/features/markets/components/PoolInfo.tsx`,
  `src/features/markets/components/PoolBadges.tsx`,
  `src/components/ui/StatTile.tsx`, `src/components/ui/TokenPairGlyph.tsx`
- Charts: `src/features/analytics/components/MarketIrmChart.tsx`,
  `MarketRateChart.tsx` (drop `MarketLiquidityChart` usage)
- Right column: `src/components/action/ActionPanel.tsx` (slider),
  `src/components/ui/MoneyInput.tsx`, `src/components/action/ReviewBlock.tsx`,
  `src/features/supply/components/SupplyLiquidityPanel.tsx`,
  `src/features/borrow/components/BorrowActions.tsx` and its panels
  (`BorrowPanel`, `RepayPanel`, `SupplyPanel`, `WithdrawPanel`)
- Tokens/styles: `src/styles.css`
- Design reference: `docs/ui/earn:pool/{screen.png,code.html,DESIGN.md}`

---

## Planning Contract

**Product Contract preservation:** Product Contract unchanged by this
enrichment. (R9 and Q1 were corrected earlier via `ce-doc-review` before
enrichment: R9 reframed to "slider already exists — restyle only", Q1 removed;
those edits already live in the Product Contract above.)

**Depth:** Standard. **Execution posture:** default (no test-first) — the suite
is behavioral and already green; restyle changes are verified against the
existing tests plus manual visual parity.

---

## Key Technical Decisions

- **KTD1 — No token migration; layout alignment only.** The detail-page
  components (`PoolInfo`, `ActionPanel`, `MoneyInput`, `ReviewBlock`, `StatTile`,
  the state cards) already use the same Luminous tokens/classes as the shipped
  list/swap pages: `island-shell` (`src/styles.css`), `--palm` (#0690d4),
  `--sea-ink` / `--sea-ink-soft`, `--line`, `.display-title` (Manrope), `.num`
  (JetBrains Mono tabular), `.amount-slider`. Work is spacing / grid / emphasis
  alignment to the mockup *inside* these components — no shared token change,
  which is why list/swap pages stay untouched. **One scoped exception (U3):** the
  `.amount-slider` rule in `src/styles.css` may be edited to give the range thumb
  a ≥44px hit area and a visible focus ring. That class is used only by
  `AmountSlider`, which is effectively detail-page-only (`SwapPanel` renders its
  own inputs and does not use `MoneyInput`), so the edit does not reach list/swap.
  No other `src/styles.css` change is made.
- **KTD2 — Card borders: subtle hairline, not mockup blue.** The mockup renders
  bold `border-2 border-primary` per card, but `DESIGN.md` specifies subtle 1px
  borders and the shipped pages use the hairline `island-shell` border. Use the
  hairline `island-shell` border on all detail cards for cross-page consistency
  (user decision). The mockup's blue per-card borders are a Figma artifact of
  the app-level `.app-frame` chrome.
- **KTD3 — Slider already exists.** `AmountSlider`
  (`src/components/ui/AmountSlider.tsx`: native `input[type=range]`, markers
  0/25/50/75/100, keyboard-operable, thumb bound to `value`) is already rendered
  by `MoneyInput` when `onQuickFill` + `maxTokens>0`, and `ActionPanel` already
  passes `onQuickFill`. No new slider is built. Work = verify its states survive
  the restyle (two-way binding, focus ring, ≥44px touch target on narrow layout,
  `aria` label/value on the range input).
- **KTD4 — Earn stat strip trimmed to the mockup's five tiles.** The earn
  variant currently renders six tiles (Supply APY, Utilization, `{collateral}
  price`, Borrow APR, **Available**, TVL). The mockup shows five: Supply APY
  (blue hero), Utilization, `{collateral}` Price, Borrow APR, TVL. Drop
  **Available** from the earn strip; lay the five out in a responsive grid
  (`grid-cols-2 md:grid-cols-5`) instead of `flex flex-wrap`. The **borrow**
  variant keeps its richer risk tiles (Borrow APR hero, LLTV, Liq. threshold,
  `{collateral}` price, Available, TVL) in the same grid — R5's "same styling",
  not "same five".
- **KTD5 — Tabs stay pill.** Keep the existing `rounded-full` pill tab strips
  (blue active) on both action hosts; do not adopt the mockup's square segmented
  control (user decision).
- **KTD6 — Restyle is test-safe by construction.** All touched components have
  only behavioral tests (no class/style assertions); `PoolInfo.test.tsx` has no
  "Liquidity" assertion, so dropping `MarketLiquidityChart` from `PoolInfo` will
  not break it (the chart component and its own isolated test are retained).
  Restyle risk is confined to DOM-structure / text / role / `aria` changes —
  keep those stable.

---

## Implementation Units

### U1. PoolInfo left column — stat grid + drop liquidity chart

- **Goal:** Align the left-column identity card to the mockup (glyphs + Manrope
  pair title + subtitle + a responsive 5-tile stat grid) and remove the
  liquidity chart, leaving IRM + Rate history.
- **Requirements:** R2, R3, R5, R6, R7.
- **Dependencies:** none.
- **Files:** `src/features/markets/components/PoolInfo.tsx`,
  `src/features/markets/components/PoolInfo.test.tsx`.
- **Approach:** Change the stat-tile container from `flex flex-wrap gap-x-8` to a
  responsive grid (`grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-3`). For the
  `earn` context, render exactly the five mockup tiles (drop the "Available"
  tile — KTD4); keep the `borrow` context's risk tiles in the same grid. Remove
  the `MarketLiquidityChart` import (`PoolInfo.tsx:7`) and its JSX
  (`PoolInfo.tsx:124`); keep `MarketIrmChart` + `MarketRateChart`. Keep
  `TokenPairGlyph`, `.display-title` title, `StaleBadge` / `SizeUnavailableChip`.
  Hairline `island-shell` cards (KTD2). No `StatTile` internal change.
- **Patterns to follow:** existing `PoolInfo.tsx` tile block and
  `PoolTable.tsx:188` (mono uppercase label style); `EarnList.tsx:28` blue
  numeric emphasis.
- **Test scenarios:**
  - Covers AE1. `earn` context renders exactly five stat tiles (Supply APY,
    Utilization, `{collateral}` price, Borrow APR, TVL) and does **not** render a
    "Liquidity" chart heading.
  - `borrow` context still renders its risk tiles (LLTV, Liq. threshold present).
  - Covers AE4 (badge half). Stale-price pool still renders the stale badge
    (R7); the Supply/Borrow-blocked-not-Withdraw gate is unchanged and verified
    in U3/U4.
  - Existing `PoolInfo.test.tsx` assertions still pass unchanged (KTD6).
- **Verification:** `/earn/$id` left column matches the mockup's 5-tile header +
  two chart cards; no liquidity card; `PoolInfo.test` green.

### U2. Detail route shells — grid, breadcrumb, state cards, borrow position card

- **Goal:** Restyle both detail routes' shell to the mockup: two-column grid,
  breadcrumb, loading / not-found / unavailable states, and the borrow "Your
  position" card — without behavioral change.
- **Requirements:** R1, R4, R12.
- **Dependencies:** none (independent of U1; different concerns in same files).
- **Files:** `src/routes/earn.$id.tsx`, `src/routes/borrow.$id.tsx`,
  `src/components/layout/PoolBreadcrumb.tsx`, `src/routes/earn.$id.test.tsx`,
  `src/routes/borrow.$id.test.tsx` (new — home for the AE3 borrow-route
  scenario); touch state cards only if they need alignment
  (`src/components/ui/states/{Loading,ErrorState,EmptyState}.tsx`).
- **Approach:** Keep the `lg:grid-cols-[1.6fr_1fr]` grid and `NetworkGuard`
  gating exactly. Restyle the breadcrumb to the mockup (blue back link +
  chevron + inert current pool). Restyle the borrow "Your position" card
  (collateral / borrowed / `HealthMeter`) to a hairline `island-shell` card that
  sits above the action tabs — data (`useMarketPosition`) and health-in-right-
  card placement unchanged. Restyle the state cards only if they diverge from
  Luminous (they already use `island-shell`). Keep all copy and the four
  terminal pool states.
- **Patterns to follow:** current `borrow.$id.tsx` position-card block;
  `PoolBreadcrumb.tsx`; mockup breadcrumb (`code.html` nav).
- **Test scenarios:**
  - Covers AE3. Borrow route with no collateral shows the position card (zeros)
    and the "Supply collateral first" gate; behavior unchanged.
  - Covers AE1. Disconnected earn route shows the `NetworkGuard` connect prompt
    in the right column.
  - Existing `earn.$id.test.tsx` passes unchanged.
- **Verification:** both routes render the mockup shell; breadcrumb + states +
  position card are Luminous; `earn.$id.test` green; no gating/behavior change.
  Covers AE5 (manual): on a narrow viewport each page collapses to a single
  column with the action card below `PoolInfo` and no horizontal scroll — check
  the slider markers and review-summary rows as the overflow risks.

### U3. Shared action card — ActionPanel / MoneyInput / ReviewBlock restyle + slider verify

- **Goal:** Align the right-column action card internals to the mockup (token-
  glyph header, "Your Balance" line, input + Max, the existing slider between
  input and review, review summary, full-width blue button) and verify the
  slider's states survive the restyle.
- **Requirements:** R2, R8, R9, R10, R11.
- **Dependencies:** none.
- **Files:** `src/components/action/ActionPanel.tsx`,
  `src/components/ui/MoneyInput.tsx`, `src/components/action/ReviewBlock.tsx`,
  `src/components/ui/AmountSlider.tsx`, `src/styles.css` (scoped `.amount-slider`
  rule only — KTD1 exception), `src/components/action/ActionPanel.test.tsx`,
  `src/components/ui/MoneyInput.test.tsx`,
  `src/components/ui/AmountSlider.test.tsx`.
- **Approach:** Align spacing/type of the `ActionPanel` header (`.display-title`
  + `TokenGlyph`), `MoneyInput` frame, and `ReviewBlock` rows to the mockup.
  Surface the balance/max context as a "Your Balance … {amount} {symbol}" line
  (MoneyInput already exposes balance — align its label; preserve `maxLabel`
  semantics such as "Supplied"). Confirm the existing `AmountSlider` renders
  between the amount input and the review block (it already does via
  `MoneyInput`); verify/ensure KTD3's states as **pass criteria** (not
  regression-only): two-way binding intact, `:focus-visible` ring visible,
  `aria-label`/value present on the range input, and the thumb hit-area ≥44px on
  the narrow layout. The current `.amount-slider` is `height: 24px` with no
  thumb-size rule, so meeting the 44px bar requires a scoped `.amount-slider`
  edit (`::-webkit-slider-thumb` min hit-area + `min-height`) — this is the KTD1
  exception. `AmountSlider.tsx` markup may change only if a new `aria`/label is
  needed.
  Full-width primary via existing `ActionButton`. **Do not change** preflight,
  `blockReason`, ack-checkbox, or tx wiring. Confirm `SwapPanel` does not consume
  `ActionPanel`/`MoneyInput` (map says it uses its own inner boxes) so swap is
  unaffected.
- **Patterns to follow:** `ActionPanel.tsx` current structure; `SwapPanel.tsx`
  inner-box styling (`rounded border border-[var(--line)]`); `code.html` action
  form (input, slider, summary rows, button).
- **Test scenarios:**
  - Covers AE2. Slider drag to 50% fills the input to half of `maxTokens` (assert
    via the existing `onQuickFill` path in `AmountSlider.test` / `MoneyInput`).
  - Slider is keyboard-operable (arrow keys change value) and exposes an
    accessible name/value on the range input.
  - Slider thumb hit-area is ≥44px on the narrow layout and shows a visible
    `:focus-visible` ring (assert the computed min height / thumb sizing).
  - `ActionPanel` still disables submit on failing preflight / hard block
    (`ActionPanel.test` unchanged).
  - Review summary shows amount, APY (where provided), and network fee rows.
- **Verification:** action card matches the mockup; `ActionPanel`, `MoneyInput`,
  `AmountSlider` tests green; slider keyboard/SR-operable; no money-path diff.

### U4. Action hosts — pill tab strips + panel wrappers restyle

- **Goal:** Restyle the earn/borrow action hosts (pill tab strips + wrapper
  spacing) to Luminous, keeping tab behavior and the first-time-borrower gate.
- **Requirements:** R2, R8.
- **Dependencies:** none hard (no file overlap with U3). Soft coordinate with
  U3: U4 can proceed in parallel; do a final visual-alignment pass once U3's card
  lands.
- **Files:** `src/features/supply/components/SupplyLiquidityPanel.tsx`,
  `src/features/borrow/components/BorrowActions.tsx`,
  `src/features/supply/components/SupplyLiquidityPanel.test.tsx`,
  `src/features/borrow/components/BorrowActions.test.tsx`.
- **Approach:** Align the `island-shell ... rounded-full` pill tab strips to the
  Luminous treatment (blue active tab, KTD5 — stay pill). Keep the tab keys/order
  (Supply/Withdraw on earn; Supply/Borrow/Repay/Withdraw on borrow), the
  `SupplyCollateralFirst` gate, and the stale-price narrowing. Wrapper spacing
  only — the inner `ActionPanel` is U3's.
- **Patterns to follow:** current tab-strip markup in both files;
  `SwapPanel.tsx:242` active-pill style.
- **Test scenarios:**
  - Active tab has `aria-selected=true`; switching tabs swaps the panel
    (`SupplyLiquidityPanel.test`, `BorrowActions.test` unchanged).
  - Covers AE3. Borrow with no collateral gates borrow/repay/withdraw behind
    "Supply collateral first"; supplying unlocks them.
- **Verification:** tab strips are Luminous pills with blue active state;
  behavior and both tests unchanged.

---

## Verification Contract

- `bunx tsc --noEmit` — clean.
- `bunx eslint .` (or the repo's lint script) — clean.
- `bunx vitest run` — full suite green; baseline is 402 tests / 81 files, and
  this restyle must not reduce that count (no test deletions; `MarketLiquidityChart`
  component + test retained).
- `bunx vite build` — succeeds.
- SSR: `/earn/$id` and `/borrow/$id` render HTTP 200 (no hydration error).
- Manual visual parity: both pages match `docs/ui/earn:pool/screen.png` (Borrow
  adapted from the same design); the slider is operable by keyboard alone; on a
  narrow viewport both pages collapse to a single column with the action card
  below `PoolInfo` and no horizontal overflow (AE5).

---

## Definition of Done

- U1–U4 landed; `/earn/$id` and `/borrow/$id` visually match the Luminous
  mockup, consistent with the shipped list/swap pages.
- The liquidity chart no longer renders in `PoolInfo`; IRM + Rate history remain.
- The existing `AmountSlider` renders in the action card and is verified
  keyboard/SR-operable; no new slider component was added.
- Card borders are the subtle hairline `island-shell` treatment (KTD2); tabs
  remain pill (KTD5).
- The full Verification Contract passes (tsc, ESLint, vitest 402+, build, SSR
  200).
- No diff to money-path modules, hooks, or gating logic — presentational
  (layout) changes only. The sole `src/styles.css` edit is the scoped
  `.amount-slider` rule for the slider's ≥44px hit area + focus ring (KTD1
  exception); no shared tokens or other classes change, so list/swap pages are
  untouched.

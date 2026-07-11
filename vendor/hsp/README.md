# Vendored HSP SDK (`@hsp/core` + `@hsp/sdk`)

These two packages are **vendored source**, copied verbatim from the HSP
reference implementation:

- **Upstream:** https://github.com/project-hsp/hsp (branch `main`)
- **Commit:** `65ba3c9de4ccd882c0c9edd830a6b72c467be02a`
- **Vendored:** 2026-07-12

## Why vendored (not an npm dependency)

`@hsp/sdk` and `@hsp/core` are **private, raw-TypeScript** npm-workspace packages
— no build, no `dist`, not published to npm. Their `exports` map serves
`./src/*.ts` directly, so a consumer must transpile the TS itself. This app does
that with Vite/esbuild (dev + build) and type-checks with the root `tsc`.

They are wired into this repo as **bun workspace packages** via
`"workspaces": ["vendor/hsp/*"]` in the root `package.json`, so
`import { HSPClient } from '@hsp/sdk'` and
`import { resolveChain } from '@hsp/core/chains/index'` resolve to the vendored
source.

## Local edits vs. upstream

The two `package.json` files are trimmed from upstream:

- `viem` pinned to `^2.54.6` (matches the app; dedupes to a single viem so the
  SDK's `EIP1193Provider`/`Address` types are identical to ours).
- `scripts` + `devDependencies` (tsx, typescript, @types/node) dropped — the app
  owns the toolchain; the vendored packages are never built independently here.

The `src/` trees are otherwise upstream source, except **4 dead-code lint fixes**
required by this repo's stricter `tsc` (`noUnusedLocals` / `noUnusedParameters`,
which upstream's tsconfig leaves off). All four just drop an unused import/param —
no behavior change:

- `core/src/policy/compliance.ts` — dropped unused imports `buildCapabilityRegistry`, `TrustAnchor`.
- `core/src/verifier/roles.ts` — dropped unused `type Hex` import.
- `sdk/src/x402.ts` — renamed unused param `chain` → `_chain` in `buildHspMandate`.

Re-apply these after re-vendoring (or run `bun run typecheck` and fix whatever the
stricter flags flag).

## Updating

Re-clone upstream at the desired commit, copy `packages/core/src` and
`packages/sdk/src` over these `src/` trees, keep the two trimmed `package.json`
files, bump the commit hash above, then run `bun install` + `bun run typecheck`.

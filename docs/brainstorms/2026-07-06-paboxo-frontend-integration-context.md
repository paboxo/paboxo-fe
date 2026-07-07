# Brainstorm Context — Paboxo Frontend Integration

**Date:** 2026-07-06
**Requirements plan:** [docs/plans/2026-07-06-001-feat-paboxo-frontend-integration-plan.md](../plans/2026-07-06-001-feat-paboxo-frontend-integration-plan.md)
**Source doc:** `references/paboxo-sc/docs/INTEGRATION-FRONTEND.md`

Catatan konteks sesi brainstorm — menyimpan dialog & alasan di balik keputusan supaya tidak hilang. Yang formal & ber-ID ada di requirements plan; ini "kenapa"-nya.

## Titik awal

- Repo `praboxo-fe` = scaffold kosong TanStack Start (React 19, TanStack Router, Tailwind 4). Belum ada Web3 sama sekali (tidak ada wagmi/viem, tidak ada wallet connect), cuma route `index` + `about`.
- Kontrak Paboxo sudah live di HashKey mainnet (chainId 177), RPC `https://mainnet.hsk.xyz`.
- Tugas: bangun FE money market dari nol berdasarkan `INTEGRATION-FRONTEND.md`.

## Keputusan yang diambil (beserta alasan)

1. **Scope: full integration** — semua aksi (supply, borrow, repay 3 mode, withdraw, liquidate, delegation, cross-chain dari Base). Alasan user: pernah kerjakan project mirip.
2. **Sumber baca: indexer/subgraph** untuk discovery/riwayat/agregat; **write tetap on-chain**.
3. **Angka penentu dibaca live dari contract (RPC/viem), bukan indexer.** Lima nilai yang bikin tx revert kalau basi: health (`checkLiquidatable`), max-borrow (`getMaxBorrowAmount`), current debt (`userBorrowShares × totalBorrowAssets / totalBorrowShares`), allowance (ERC20 + delegation), freshness harga (`latestRoundData.updatedAt`, feed revert >1h). Semua nilai + perilaku revert ada di §6 & §10 dokumen; framing "jangan dari indexer" adalah keputusan arsitektur sesi ini karena user memilih baca via indexer.
4. **"Via RPC" = panggil fungsi read (`view`/`pure`) di kontrak langsung** (`eth_call`, viem `.read.*`) — bukan tanya ke database indexer. Selalu fresh di block itu.
5. **Indexer belum ada → mock dulu, swap ke subgraph nanti.** Cakupan mock: **indexer saja**. Read on-chain + write ke mainnet 177 asli sejak awal (bukan di-mock) — supaya transaksi nyata tervalidasi awal.
6. **ABI diberikan user nanti setelah contract di-deploy** → ABI = input yang di-inject, bukan di-generate (asumsi `forge build` gugur). Konsekuensi: (a) address bisa berubah saat redeploy → address + ABI diperlakukan sebagai config, jangan hardcode; (b) di awal jalur on-chain juga belum bisa wiring real sampai ABI tiba, jadi praktis dua-duanya mock dulu.
7. **Market di-hardcode ke 4 pool** sampai indexer menyediakan discovery dinamis (tidak ada on-chain pool list).
8. **Stack:** wagmi v3 + viem, wallet via **Reown AppKit** (`docs.reown.com`), fetch indexer via **GraphQL + TanStack Query** (mutation, caching, invalidation).
9. **Urutan build: technical foundation dulu (tipis)** — provider (wagmi/viem/Reown/TanStack Query) + wallet connect + **data-adapter seam** (chainAdapter viem + indexerAdapter GraphQL) di balik **typed hooks** bermock. UI menyusul nempel ke hooks stabil; wiring real (ABI/indexer) masuk di belakang hooks tanpa ubah UI.

## Blocker eksternal (bukan kerjaan FE)

- ABI (diberikan user setelah deploy).
- Deploy indexer/subgraph.
- Deploy `PaboxoCCIPSender` di Base (untuk flow cross-chain).
- Backend keeper (oracle cron jaga freshness harga, liquidation bot, AI rebalance agent).

## Ditunda ke planning

- Versi/kompatibilitas wagmi v3 + Reown AppKit di bawah SSR TanStack Start.
- Formula supply-APY (sumber reserve-factor).
- Default fee-tier DODO + UX slippage untuk repay mode B & C.
- Bentuk data mock indexer — cermin entitas subgraph di `INTEGRATION-INDEXER.md` supaya swap drop-in.

## Referensi

- `references/paboxo-sc/docs/INTEGRATION-FRONTEND.md` — aksi user, read, aturan dua-alamat, unit, gotchas.
- `references/paboxo-sc/docs/INTEGRATION-INDEXER.md` — event/entitas untuk indexer adapter & bentuk mock.
- `references/paboxo-sc/docs/INTEGRATION-BACKEND.md` — peran keeper yang FE bergantung padanya.
- `references/paboxo-sc/broadcast/` — address ter-deploy per run (sampai ABI diberikan langsung).

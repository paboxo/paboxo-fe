import { configDefaults, defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load ALL vars (no prefix filter) so the dev-server can read non-VITE_ vars
  // that must NEVER reach the browser bundle. `AGENT_UPSTREAM` is the real
  // agent REST host — kept in `.env.local` (gitignored), never hardcoded here,
  // so it stays out of source control and out of the client build.
  const env = loadEnv(mode, process.cwd(), '')
  const agentUpstream = env.AGENT_UPSTREAM

  // Dev-only same-origin proxies. Browser reads are blocked when the upstream
  // sends no CORS headers, so route them through the dev server here. For a
  // real deployment, replace these with an edge/backend proxy (the Vite dev
  // server does not run in production).
  //  - /hsk-rpc   → HashKey RPC (public RPC sends no CORS headers).
  //  - /agent-api → rebalance-agent REST at AGENT_UPSTREAM (added only when set;
  //    also lets a backend inject auth so no key/host ships to the browser).
  const proxy = {
    '/hsk-rpc': {
      target: 'https://mainnet.hsk.xyz',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/hsk-rpc/, ''),
    },
    ...(agentUpstream
      ? {
          '/agent-api': {
            target: agentUpstream,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/agent-api/, ''),
          },
        }
      : {}),
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackStart(),
      netlify(),
      viteReact(),
    ],
    server: { proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      // Reference material (senja-*) ships its own test suites — never run them.
      exclude: [...configDefaults.exclude, 'references/**'],
      // Pin every source-selecting var so a local `.env.local` (dev live mode,
      // real indexer/agent endpoints) can never flip the suite onto real
      // network reads — tests must be hermetic and always use the mocks.
      env: {
        VITE_DATA_MODE: 'mock',
        VITE_PAYMENT_MODE: 'mock',
        VITE_INDEXER_URL: '',
        VITE_AGENT_API_URL: '',
        VITE_HASHKEY_RPC: '',
      },
    },
  }
})

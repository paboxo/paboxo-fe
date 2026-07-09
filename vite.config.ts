import { defineConfig } from 'vitest/config'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  // Dev-only same-origin RPC proxy: the public HashKey RPC sends no CORS
  // headers, so browser reads are blocked. Point VITE_HASHKEY_RPC at
  // http://localhost:3000/hsk-rpc (see .env.example) to route live reads here.
  server: {
    proxy: {
      '/hsk-rpc': {
        target: 'https://mainnet.hsk.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hsk-rpc/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Pin the data source for tests so a local `.env.local` (e.g. live mode
    // for dev) can never flip the suite onto real RPC reads.
    env: { VITE_DATA_MODE: 'mock' },
  },
})

export default config

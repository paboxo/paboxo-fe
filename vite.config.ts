import { defineConfig } from 'vitest/config'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Pin the data source for tests so a local `.env.local` (e.g. live mode
    // for dev) can never flip the suite onto real RPC reads.
    env: { VITE_DATA_MODE: 'mock' },
  },
})

export default config

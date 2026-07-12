import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Address } from '#/lib/contracts'
import { createLiveIndexerAdapter } from './indexerAdapter'

// The indexer stores `user` lowercased and filters with an exact match, so the
// adapter must lowercase the checksummed address wagmi provides — otherwise a
// real wallet's history reads back empty (regression guard).
const CHECKSUMMED = '0x0EcE75F3c36F7df2136dac7633165dBFf53de3Cd' as Address
const LOWER = CHECKSUMMED.toLowerCase()

function userVarFromLastCall(fetchMock: ReturnType<typeof vi.fn>): string {
  const body = JSON.parse(fetchMock.mock.calls[0][1].body)
  return body.variables.user
}

afterEach(() => vi.restoreAllMocks())

describe('live indexer lowercases the user filter', () => {
  it('getUserHistory sends a lowercased user', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await createLiveIndexerAdapter('https://x/graphql').getUserHistory(
      CHECKSUMMED,
    )

    expect(userVarFromLastCall(fetchMock)).toBe(LOWER)
  })

  it('getUserSupplyHistory sends a lowercased user', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await createLiveIndexerAdapter('https://x/graphql').getUserSupplyHistory(
      CHECKSUMMED,
      '0xC6FA92dFDABd64e0605e479b5cAB3696B5d17270',
    )

    expect(userVarFromLastCall(fetchMock)).toBe(LOWER)
  })
})

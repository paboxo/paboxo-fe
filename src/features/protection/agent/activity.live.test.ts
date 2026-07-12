import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLiveAgentActions } from './activity.live'

const USER = '0x1111111111111111111111111111111111111111' as const

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getLiveAgentActions', () => {
  it('maps backend rows to AgentAction and reads /api/actions', async () => {
    const rows = [
      {
        id: 7,
        llmMessage: 'Rotated to defend HF',
        hf: 1.08,
        lever: 'rotate',
        outcome: 'sent',
        amountIn: '500000000000000000000',
        token: 'pxWHSK',
        txHash: '0xabc',
        ts: 1_720_500_000_000,
      },
    ]
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(rows) })
    vi.stubGlobal('fetch', fetchMock)

    const actions = await getLiveAgentActions('/agent-api', USER, 5)

    expect(fetchMock).toHaveBeenCalledWith(
      `/agent-api/api/actions?user=${USER}&limit=5`,
    )
    expect(actions[0]).toMatchObject({
      id: '7',
      lever: 'rotate',
      outcome: 'sent',
      token: 'pxWHSK',
      hf: 1.08,
      txHash: '0xabc',
    })
  })

  it('coerces an unknown lever/outcome to safe defaults', async () => {
    const rows = [{ id: 1, lever: 'bogus', outcome: 'weird', ts: 1 }]
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: () => Promise.resolve(rows) }),
    )

    const [action] = await getLiveAgentActions('https://x', USER)

    expect(action.lever).toBe('signal-only')
    expect(action.outcome).toBe('skipped')
  })

  it('degrades to an empty list on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await getLiveAgentActions('https://x', USER)).toEqual([])
  })

  it('degrades to an empty list on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    expect(await getLiveAgentActions('https://x', USER)).toEqual([])
  })

  it('returns [] without a request when no user is connected', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await getLiveAgentActions('https://x')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

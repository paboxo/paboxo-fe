import { describe, expect, it } from 'vitest'
import { paginate } from './paginate'

const items = Array.from({ length: 25 }, (_, i) => i)

describe('paginate', () => {
  it('returns a full first page and the correct page count', () => {
    const r = paginate(items, 1, 10)
    expect(r.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(r.page).toBe(1)
    expect(r.pageCount).toBe(3)
  })

  it('returns the remainder on the last page', () => {
    const r = paginate(items, 3, 10)
    expect(r.items).toEqual([20, 21, 22, 23, 24])
  })

  it('clamps an out-of-range page into bounds', () => {
    expect(paginate(items, 99, 10).page).toBe(3)
    expect(paginate(items, 0, 10).page).toBe(1)
  })

  it('reports one empty page for an empty list', () => {
    const r = paginate([], 1, 10)
    expect(r.items).toEqual([])
    expect(r.pageCount).toBe(1)
  })
})

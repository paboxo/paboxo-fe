/** Client-side pagination for a fully-loaded list. Pure + testable. */
export interface PageResult<T> {
  items: T[]
  /** 1-based, clamped into `[1, pageCount]`. */
  page: number
  pageCount: number
}

export function paginate<T>(
  all: T[],
  page: number,
  pageSize: number,
): PageResult<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize))
  const clamped = Math.min(Math.max(1, page), pageCount)
  const start = (clamped - 1) * pageSize
  return { items: all.slice(start, start + pageSize), page: clamped, pageCount }
}

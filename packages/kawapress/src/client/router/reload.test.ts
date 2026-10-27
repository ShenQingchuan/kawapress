import type { ReloadTarget } from './reload'
import { describe, expect, it, vi } from 'vitest'
import { reloadDocument } from './reload'

function createTarget(current: string): ReloadTarget & { assigned: string[] } {
  const url = new URL(`http://localhost${current}`)
  const assigned: string[] = []
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    assigned,
    assign: vi.fn((location: string) => {
      assigned.push(location)
    }),
  }
}

describe('reloadDocument', () => {
  it('loads the target as a whole new document', () => {
    const target = createTarget('/guide/intro')

    expect(reloadDocument('/guide/routing?from=nav#top', '/', target)).toBe(true)
    expect(target.assigned).toEqual(['/guide/routing?from=nav#top'])
  })

  it('applies the site base', () => {
    const target = createTarget('/kawapress/guide/intro')

    reloadDocument('/guide/routing', '/kawapress/', target)

    expect(target.assigned).toEqual(['/kawapress/guide/routing'])
  })

  it('refuses to reload the document that is already open', () => {
    // The same request would fail again, so the caller reports the error instead.
    const target = createTarget('/guide/routing?from=nav#top')

    expect(reloadDocument('/guide/routing?from=nav#top', '/', target)).toBe(false)
    expect(target.assigned).toEqual([])
  })
})

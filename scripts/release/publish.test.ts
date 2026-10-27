import { describe, expect, it } from 'vitest'

import { filterPublishOrder, sortForPublish } from './publish.mjs'

function packed(name: string, dependencies: Record<string, string> = {}) {
  return { manifest: { dependencies }, name }
}

describe('sortForPublish', () => {
  it('publishes dependencies before the packages that depend on them', () => {
    const order = sortForPublish([
      packed('kawapress', { '@kawapress/preset-nagi': '0.1.0' }),
      packed('@kawapress/preset-nagi'),
      packed('create-kawapress'),
    ])

    expect(order.map(packageInfo => packageInfo.name)).toEqual([
      '@kawapress/preset-nagi',
      'create-kawapress',
      'kawapress',
    ])
  })

  it('refuses production dependency cycles', () => {
    expect(() => sortForPublish([
      packed('a', { b: '1.0.0' }),
      packed('b', { a: '1.0.0' }),
    ])).toThrow('Production dependency cycle')
  })
})

describe('filterPublishOrder', () => {
  const order = [packed('a'), packed('b'), packed('c')]

  it('returns the full order outside bootstrap mode', () => {
    expect(filterPublishOrder(order, undefined)).toHaveLength(3)
  })

  it('keeps only the packages that are missing from npm', () => {
    expect(filterPublishOrder(order, new Set(['a', 'c'])).map(packageInfo => packageInfo.name))
      .toEqual(['a', 'c'])
  })
})

import type { OutletItem, OutletName, OutletRegistry } from './outlet'
import { describe, expect, it } from 'vitest'
import {
  assertOutletName,
  findUnconsumedOutletItems,
  formatUnconsumedOutletWarnings,
  getOutletItems,
  isOutletName,
  OUTLET_NAMES,
} from './outlet'

function registry(
  items: Partial<Record<OutletName, OutletItem[]>>,
): OutletRegistry {
  const entries = {} as Record<OutletName, readonly OutletItem[]>
  for (const name of OUTLET_NAMES) {
    entries[name] = items[name] ?? []
  }
  return entries
}

function item(owner: string, outlet: OutletName, id: string): OutletItem {
  return { id: `${owner}:${id}`, owner, component: {} }
}

describe('outlet names', () => {
  it('keeps the four public outlets', () => {
    expect(OUTLET_NAMES).toEqual([
      'header.actions',
      'doc.header',
      'doc.footer',
      'doc.after',
    ])
  })

  it('recognizes only the published names', () => {
    expect(isOutletName('doc.after')).toBe(true)
    expect(isOutletName('doc.before')).toBe(false)
    expect(isOutletName(undefined)).toBe(false)
    expect(() => assertOutletName('doc.before', '<KawaOutlet>')).toThrow(
      'KawaPress: <KawaOutlet> uses the unknown outlet "doc.before". Available outlets: header.actions, doc.header, doc.footer, doc.after.',
    )
  })

  it('returns an empty list for outlets without items', () => {
    expect(getOutletItems(registry({}), 'doc.footer')).toEqual([])
  })
})

describe('findUnconsumedOutletItems', () => {
  it('reports items whose outlet never rendered', () => {
    const outlets = registry({
      'header.actions': [
        item('@acme/plugin-search', 'header.actions', 'trigger'),
      ],
      'doc.after': [item('@acme/plugin-comments', 'doc.after', 'comments')],
    })

    expect(findUnconsumedOutletItems(outlets, ['header.actions'])).toEqual([
      {
        owner: '@acme/plugin-comments',
        outlet: 'doc.after',
        id: '@acme/plugin-comments:comments',
      },
    ])
  })

  it('reports nothing when every outlet rendered', () => {
    const outlets = registry({
      'doc.header': [item('@acme/plugin-llms', 'doc.header', 'actions')],
    })

    expect(findUnconsumedOutletItems(outlets, OUTLET_NAMES)).toEqual([])
  })

  it('ignores rendered names that are not outlets', () => {
    const outlets = registry({
      'doc.footer': [item('@acme/plugin-updated-at', 'doc.footer', 'updated-at')],
    })

    expect(findUnconsumedOutletItems(outlets, ['doc.before'])).toHaveLength(1)
  })
})

describe('formatUnconsumedOutletWarnings', () => {
  it('warns once per plugin and names outlet, item, and fix', () => {
    const lines = formatUnconsumedOutletWarnings([
      {
        owner: '@acme/plugin-updated-at',
        outlet: 'doc.footer',
        id: '@acme/plugin-updated-at:updated-at',
      },
      {
        owner: '@acme/plugin-updated-at',
        outlet: 'doc.after',
        id: '@acme/plugin-updated-at:feedback',
      },
      {
        owner: '@acme/plugin-comments',
        outlet: 'doc.after',
        id: '@acme/plugin-comments:comments',
      },
    ])

    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('"@acme/plugin-updated-at"')
    expect(lines[0]).toContain('doc.footer (item "@acme/plugin-updated-at:updated-at")')
    expect(lines[0]).toContain('doc.after (item "@acme/plugin-updated-at:feedback")')
    expect(lines[0]).toContain('<KawaOutlet name="..." />')
    expect(lines[1]).toContain('"@acme/plugin-comments"')
  })

  it('stays silent without unconsumed items', () => {
    expect(formatUnconsumedOutletWarnings([])).toEqual([])
  })
})

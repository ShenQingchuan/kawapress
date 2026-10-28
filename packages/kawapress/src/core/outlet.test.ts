import type { OutletItem, OutletName, OutletRegistry, OutletSlots } from './outlet'
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
  items: Partial<Record<OutletName, Partial<OutletSlots>>>,
): OutletRegistry {
  const entries = {} as Record<OutletName, OutletSlots>
  for (const name of OUTLET_NAMES) {
    entries[name] = { prepend: [], append: [], ...items[name] }
  }
  return entries
}

function item(owner: string, outlet: OutletName, id: string): OutletItem {
  return { id: `${owner}:${id}`, owner, component: {} }
}

describe('outlet names', () => {
  it('keeps the eight public outlets', () => {
    expect(OUTLET_NAMES).toEqual([
      'layout.header',
      'layout.header.start',
      'layout.header.end',
      'layout.sidebar',
      'layout.footer',
      'doc',
      'doc.under-title',
      'doc.toc',
    ])
  })

  it('recognizes only the published names', () => {
    expect(isOutletName('doc')).toBe(true)
    expect(isOutletName('doc.before')).toBe(false)
    expect(isOutletName(undefined)).toBe(false)
    expect(() => assertOutletName('doc.before', '<KawaOutlet>')).toThrow(
      'KawaPress: <KawaOutlet> uses the unknown outlet "doc.before". Available outlets: layout.header, layout.header.start, layout.header.end, layout.sidebar, layout.footer, doc, doc.under-title, doc.toc.',
    )
  })

  it('returns an empty list for outlets without items', () => {
    expect(getOutletItems(registry({}), 'doc')).toEqual([])
  })

  it('lists the prepended items before the appended ones', () => {
    const outlets = registry({
      doc: {
        prepend: [item('@acme/plugin-crumbs', 'doc', 'crumbs')],
        append: [item('@acme/plugin-comments', 'doc', 'comments')],
      },
    })

    expect(getOutletItems(outlets, 'doc').map(entry => entry.id)).toEqual([
      '@acme/plugin-crumbs:crumbs',
      '@acme/plugin-comments:comments',
    ])
  })
})

describe('findUnconsumedOutletItems', () => {
  it('reports items whose outlet never rendered', () => {
    const outlets = registry({
      'layout.header.end': {
        prepend: [item('@acme/plugin-search', 'layout.header.end', 'trigger')],
      },
      'doc': { append: [item('@acme/plugin-comments', 'doc', 'comments')] },
    })

    expect(findUnconsumedOutletItems(outlets, ['layout.header.end'])).toEqual([
      {
        owner: '@acme/plugin-comments',
        outlet: 'doc',
        id: '@acme/plugin-comments:comments',
      },
    ])
  })

  it('reports nothing when every outlet rendered', () => {
    const outlets = registry({
      'doc.under-title': {
        append: [item('@acme/plugin-llms', 'doc.under-title', 'actions')],
      },
    })

    expect(findUnconsumedOutletItems(outlets, OUTLET_NAMES)).toEqual([])
  })

  it('ignores rendered names that are not outlets', () => {
    const outlets = registry({
      doc: { append: [item('@acme/plugin-updated-at', 'doc', 'updated-at')] },
    })

    expect(findUnconsumedOutletItems(outlets, ['doc.before'])).toHaveLength(1)
  })
})

describe('formatUnconsumedOutletWarnings', () => {
  it('warns once per plugin and names outlet, item, and fix', () => {
    const lines = formatUnconsumedOutletWarnings([
      {
        owner: '@acme/plugin-updated-at',
        outlet: 'doc',
        id: '@acme/plugin-updated-at:updated-at',
      },
      {
        owner: '@acme/plugin-updated-at',
        outlet: 'doc',
        id: '@acme/plugin-updated-at:feedback',
      },
      {
        owner: '@acme/plugin-comments',
        outlet: 'doc',
        id: '@acme/plugin-comments:comments',
      },
    ])

    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('"@acme/plugin-updated-at"')
    expect(lines[0]).toContain('doc (item "@acme/plugin-updated-at:updated-at")')
    expect(lines[0]).toContain('doc (item "@acme/plugin-updated-at:feedback")')
    expect(lines[0]).toContain('<KawaOutlet name="..." />')
    expect(lines[1]).toContain('"@acme/plugin-comments"')
  })

  it('stays silent without unconsumed items', () => {
    expect(formatUnconsumedOutletWarnings([])).toEqual([])
  })
})

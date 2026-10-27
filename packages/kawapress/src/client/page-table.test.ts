// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'
import {
  createPageLoader,
  createPageTable,
  loadPageTable,
  loadStyle,
  preloadModule,
  readPageTableUrl,
} from './page-table'

const BASE = '/'

function head(): HTMLHeadElement {
  return document.head
}

function links(rel: string): HTMLLinkElement[] {
  return Array.from(head().querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`))
}

afterEach(() => {
  head().innerHTML = ''
  document.body.innerHTML = ''
})

describe('readPageTableUrl', () => {
  it('reads the URL of the table from the served markup', () => {
    const meta = document.createElement('meta')
    meta.name = 'kawapress-pages'
    meta.content = '/assets/pages-abc123.js'
    head().append(meta)

    expect(readPageTableUrl()).toBe('/assets/pages-abc123.js')
  })

  it('explains what is missing without the meta tag', () => {
    expect(() => readPageTableUrl()).toThrow(/kawapress-pages/)
    expect(() => readPageTableUrl()).toThrow(/kawapress build/)
  })
})

describe('createPageTable', () => {
  it('turns every record into a loader', () => {
    const table = createPageTable({
      '/': 'indexHash',
      '/guide/intro': ['introHash', [], []],
    }, BASE)

    expect(Object.keys(table)).toEqual(['/', '/guide/intro'])
    expect(table['/']).toBeTypeOf('function')
    expect(table['/guide/intro']).toBeTypeOf('function')
  })
})

describe('loadPageTable', () => {
  it('imports the table file the HTML points at', async () => {
    const url = `data:text/javascript,${
      encodeURIComponent('export default { "/guide/intro": "introHash" }')
    }`

    const table = await loadPageTable(url, BASE)

    expect(Object.keys(table)).toEqual(['/guide/intro'])
  })
})

describe('createPageLoader', () => {
  it('preloads the extra JS of a page once', async () => {
    const loader = createPageLoader(
      '/guide/preloads',
      ['preloadsHash', ['assets/helper.js', 'assets/helper2.js'], []],
      BASE,
    )

    // The page chunk does not exist in this environment, so the import fails
    // after the preloads were added: that is the part under test.
    await loader().catch(() => {})

    expect(links('modulepreload').map(link => link.getAttribute('href'))).toEqual([
      '/assets/helper.js',
      '/assets/helper2.js',
    ])
  })

  it('waits for the page stylesheet before loading the page', async () => {
    const loader = createPageLoader(
      '/guide/styled',
      ['styledHash', [], ['assets/styled.css']],
      BASE,
    )
    let settled = false
    const run = loader().catch(() => {}).then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled, 'the page must wait for its stylesheet').toBe(false)
    const style = links('stylesheet')[0]
    expect(style.getAttribute('href')).toBe('/assets/styled.css')

    style.dispatchEvent(new Event('load'))
    await run
    expect(settled).toBe(true)
  })

  it('does not wait twice for a stylesheet it already loaded', async () => {
    const href = '/assets/once.css'
    const first = loadStyle(href)
    links('stylesheet')[0].dispatchEvent(new Event('load'))
    await first

    await expect(loadStyle(href)).resolves.toBeUndefined()
    expect(links('stylesheet')).toHaveLength(1)
  })
})

describe('loadStyle', () => {
  it('inserts a stylesheet that is not in the document yet', async () => {
    const loading = loadStyle('/assets/late.css')
    const [link] = links('stylesheet')

    expect(link.getAttribute('href')).toBe('/assets/late.css')
    link.dispatchEvent(new Event('load'))
    await loading
  })

  it('reuses the stylesheet a document already carries', async () => {
    const existing = document.createElement('link')
    existing.rel = 'stylesheet'
    existing.href = '/assets/first-paint.css'
    head().append(existing)

    const loading = loadStyle('/assets/first-paint.css')

    expect(links('stylesheet')).toHaveLength(1)
    existing.dispatchEvent(new Event('load'))
    await loading
  })

  it('does not block the page when a stylesheet fails', async () => {
    const loading = loadStyle('/assets/broken.css')

    links('stylesheet')[0].dispatchEvent(new Event('error'))

    await expect(loading).resolves.toBeUndefined()
  })
})

describe('preloadModule', () => {
  it('inserts one preload per file', () => {
    preloadModule('/assets/only-once.js')
    preloadModule('/assets/only-once.js')

    expect(links('modulepreload')).toHaveLength(1)
  })

  it('keeps the preload the HTML already carries', () => {
    const existing = document.createElement('link')
    existing.rel = 'modulepreload'
    existing.href = '/assets/from-html.js'
    head().append(existing)

    preloadModule('/assets/from-html.js')

    expect(links('modulepreload')).toHaveLength(1)
  })
})

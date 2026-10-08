import type { PageBuildArtifact } from 'kawapress'
import { describe, expect, it } from 'vitest'
import { createSitemapItems } from './items'

function page(routePath: string, frontmatter: Record<string, unknown> = {}, file = `/site${routePath}.md`): PageBuildArtifact {
  return {
    source: '',
    file,
    sourcePath: `${routePath === '/' ? '/index' : routePath}.md`,
    routePath,
    pageData: { path: routePath, title: '', headers: [], frontmatter } as unknown as PageBuildArtifact['pageData'],
  }
}

const locales = {
  root: { label: '简体中文', lang: 'zh-CN' },
  en: { label: 'English', lang: 'en' },
}

describe('createSitemapItems', () => {
  it('emits relative urls and groups translations with links', () => {
    const items = createSitemapItems({
      pages: [
        page('/'),
        page('/en'),
        page('/guide'),
        page('/en/guide'),
        page('/only-root'),
      ],
      locales,
      lastUpdated: false,
    })

    expect(items).toEqual([
      { url: '', lastmod: undefined, links: [{ lang: 'zh-CN', url: '' }, { lang: 'en', url: 'en' }] },
      { url: 'en', lastmod: undefined, links: [{ lang: 'zh-CN', url: '' }, { lang: 'en', url: 'en' }] },
      { url: 'guide', lastmod: undefined, links: [{ lang: 'zh-CN', url: 'guide' }, { lang: 'en', url: 'en/guide' }] },
      { url: 'en/guide', lastmod: undefined, links: [{ lang: 'zh-CN', url: 'guide' }, { lang: 'en', url: 'en/guide' }] },
      { url: 'only-root', lastmod: undefined },
    ])
  })

  it('excludes pages with sitemap: false', () => {
    const items = createSitemapItems({
      pages: [page('/visible'), page('/hidden', { sitemap: false })],
      lastUpdated: false,
    })
    expect(items.map(item => item.url)).toEqual(['visible'])
  })

  it('reads lastmod only when lastUpdated is enabled', () => {
    const gitLastUpdated = new Map([['/site/guide.md', 1_700_000_000_000]])
    const pages = [page('/guide')]

    expect(createSitemapItems({ pages, lastUpdated: false, gitLastUpdated })[0].lastmod).toBeUndefined()
    expect(createSitemapItems({ pages, lastUpdated: true, gitLastUpdated })[0].lastmod).toBe(1_700_000_000_000)
  })

  it('lets frontmatter override or disable lastmod', () => {
    const items = createSitemapItems({
      pages: [
        page('/manual', { lastUpdated: '2023-05-06' }),
        page('/off', { lastUpdated: false }),
      ],
      lastUpdated: true,
      gitLastUpdated: new Map([['/site/manual.md', 1], ['/site/off.md', 1]]),
    })
    expect(items[0].lastmod).toBe(Date.parse('2023-05-06T00:00:00.000Z'))
    expect(items[1].lastmod).toBeUndefined()
  })

  it('rejects an invalid frontmatter lastUpdated date', () => {
    expect(() => createSitemapItems({
      pages: [page('/bad', { lastUpdated: 'not-a-date' })],
      lastUpdated: true,
    })).toThrow('frontmatter lastUpdated 不是有效日期')
  })
})

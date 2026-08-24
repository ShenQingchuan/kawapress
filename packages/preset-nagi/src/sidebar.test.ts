import type { PageData } from 'kawapress'
import { describe, expect, it } from 'vitest'
import {
  createSidebar,
  defineLocalizedSidebars,
  findSidebarNavigation,
  resolveConfiguredSidebar,
} from './sidebar'

function page(path: string, title: string): PageData {
  return {
    path,
    title,
    frontmatter: {},
    headers: [],
  }
}

describe('nagi sidebar metadata', () => {
  it('localizes directories and orders listed pages', () => {
    const pages = {
      '/guide/getting-started': page('/guide/getting-started', '快速开始'),
      '/guide/what-is-kawapress': page('/guide/what-is-kawapress', 'KawaPress 是什么？'),
      '/guide/appendix': page('/guide/appendix', '附录'),
    }

    expect(createSidebar(pages, {
      meta: {
        '/': [{ type: 'dir', name: 'guide', label: '指南' }],
        '/guide': ['what-is-kawapress', 'getting-started'],
      },
    })).toEqual([{
      text: '指南',
      items: [
        { text: 'KawaPress 是什么？', link: '/guide/what-is-kawapress' },
        { text: '快速开始', link: '/guide/getting-started' },
        { text: '附录', link: '/guide/appendix' },
      ],
    }])
  })

  it('builds locale sidebars from one route structure', () => {
    const sidebars = defineLocalizedSidebars({
      locales: {
        zhCN: '',
        en: '/en',
      },
      items: [{
        text: { zhCN: '指南', en: 'Guide' },
        items: [{
          text: { zhCN: '快速开始', en: 'Getting Started' },
          link: '/guide/getting-started',
        }],
      }],
    })

    expect(sidebars.zhCN[0]?.items?.[0]?.link)
      .toBe('/guide/getting-started')
    expect(sidebars.en[0]).toMatchObject({
      text: 'Guide',
      items: [{
        text: 'Getting Started',
        link: '/en/guide/getting-started',
      }],
    })
  })

  it('uses the sidebar order for previous and next page navigation', () => {
    const items = [{
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/introduction' },
        { text: 'Getting Started', link: '/guide/getting-started' },
      ],
    }, {
      text: 'Reference',
      items: [
        { text: 'API', link: '/reference/api' },
        { text: 'External', link: 'https://example.com' },
      ],
    }]

    expect(findSidebarNavigation(items, '/guide/getting-started/')).toEqual({
      previous: { text: 'Introduction', link: '/guide/introduction' },
      next: { text: 'API', link: '/reference/api' },
    })
  })

  it('resolves VitePress-style sidebar config by the longest path prefix', () => {
    const sidebar = resolveConfiguredSidebar({
      '/guide/': {
        base: '/guide/',
        items: [{
          text: 'Guide',
          items: [{ text: 'Start', link: 'start' }],
        }],
      },
      '/guide/advanced/': [
        { text: 'Advanced', link: '/guide/advanced/' },
      ],
    }, '/guide/start')

    expect(sidebar).toEqual([{
      text: 'Guide',
      items: [{
        text: 'Start',
        link: '/guide/start',
      }],
    }])
    expect(resolveConfiguredSidebar({
      '/guide/': [],
    }, '/reference/api')).toBeUndefined()
  })

  it('uses locale-specific metadata below the locale root', () => {
    const pages = {
      '/en/guide/getting-started': page('/en/guide/getting-started', 'Getting Started'),
    }

    expect(createSidebar(pages, {
      base: '/en',
      meta: {
        '/en': [{ type: 'dir', name: 'guide', label: 'Guide' }],
      },
    })[0]?.text).toBe('Guide')
  })
})

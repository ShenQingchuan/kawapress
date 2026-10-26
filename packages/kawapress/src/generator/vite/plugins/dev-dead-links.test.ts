import type { ViteDevServer } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { PageRouteIndex } from './pages'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createLinkRegistry } from '../../../compiler/link-registry'
import { devDeadLinksPlugin } from './dev-dead-links'

const ROOT = '/site'
const FILE = join(ROOT, 'guide.md')

function createHarness(options: {
  deadLinks?: Parameters<typeof devDeadLinksPlugin>[0]['deadLinks']
  routes?: string[]
  target?: string
  headings?: string[]
} = {}) {
  const registry = createLinkRegistry()
  registry.set({
    route: '/guide',
    source: '/guide.md',
    headings: options.headings ?? ['setup'],
    links: [
      { href: './missing', target: options.target ?? '/guide/missing', line: 3 },
      { href: '#setup', target: '#setup', line: 4 },
      { href: '#nope', target: '#nope', line: 5 },
      { href: '/other#details', target: '/other#details', line: 6 },
    ],
  })
  const pageLoader = {
    sourceRoot: ROOT,
    registry,
  } as unknown as MarkdownPageLoader
  const pageRoutes: PageRouteIndex = {
    routes: async () => options.routes ?? ['/guide', '/other'],
    invalidate() {},
  }
  const warn = vi.fn()
  const plugin = devDeadLinksPlugin({
    pageLoader,
    pageRoutes,
    deadLinks: options.deadLinks ?? { level: 'warn', ignore: [] },
  })
  const server = { config: { logger: { warn } } } as unknown as ViteDevServer
  const configureServer = plugin.configureServer as (devServer: ViteDevServer) => void
  const transform = plugin.transform as (code: string, id: string) => Promise<void>
  configureServer(server)

  return { warn, transform }
}

describe('devDeadLinksPlugin', () => {
  it('warns about dead pages and same-page anchors only', async () => {
    const { warn, transform } = createHarness()

    await transform('', FILE)

    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      'KawaPress: dead link /guide.md:3  ./missing  missing-page',
      'KawaPress: dead link /guide.md:5  #nope  missing-anchor',
    ])
  })

  it('stays quiet when the links resolve', async () => {
    const { warn, transform } = createHarness({ target: '/guide', headings: ['setup', 'nope'] })

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })

  it('reports each problem once per module', async () => {
    const { warn, transform } = createHarness()

    await transform('', FILE)
    await transform('', FILE)

    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('ignores links configured in deadLinks.ignore', async () => {
    const { warn, transform } = createHarness({
      deadLinks: { level: 'warn', ignore: [/^\/guide\//, '#nope'] },
    })

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })

  it('does nothing when the site disables the check', async () => {
    const { warn, transform } = createHarness({ deadLinks: false })

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })

  it('does nothing for queries and other files', async () => {
    const { warn, transform } = createHarness()

    await transform('', `${FILE}?raw`)
    await transform('', join(ROOT, 'guide.vue'))

    expect(warn).not.toHaveBeenCalled()
  })

  it('does nothing outside the dev server', async () => {
    const registry = createLinkRegistry()
    registry.set({
      route: '/guide',
      source: '/guide.md',
      headings: [],
      links: [{ href: './missing', target: '/guide/missing', line: 1 }],
    })
    const warn = vi.fn()
    const plugin = devDeadLinksPlugin({
      pageLoader: { sourceRoot: ROOT, registry } as unknown as MarkdownPageLoader,
      pageRoutes: { routes: async () => ['/guide'], invalidate() {} },
      deadLinks: { level: 'warn', ignore: [] },
    })
    const transform = plugin.transform as (code: string, id: string) => Promise<void>

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })
})

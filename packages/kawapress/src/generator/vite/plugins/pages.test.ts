import type { ViteDevServer } from 'vite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMarkdownPageLoader } from '../../../compiler/page-loader'
import { createGeneratorPluginRunner } from '../../../plugin/generator-runner'
import {
  PAGE_MANIFEST_MODULE_ID,
  renderPagesModule,
  virtualPagesPlugin,
} from './pages'

const RESOLVED_ID = `\0${PAGE_MANIFEST_MODULE_ID}`

describe('renderPagesModule', () => {
  it('writes one record per page, keyed by route path', () => {
    const source = renderPagesModule([
      { path: '/guide/intro', id: '/src/guide/intro.md', summary: { title: 'Intro' } },
      { path: '/', id: '/src/index.md', summary: { title: 'Home', layout: 'home' } },
    ])

    expect(source).toBe([
      'export const pageManifest = {',
      '  "/guide/intro": { title: "Intro", load: () => import("/src/guide/intro.md") },',
      '  "/": { title: "Home", layout: "home", load: () => import("/src/index.md") },',
      '}',
      '',
    ].join('\n'))
  })

  it('keeps the order of the pages it is given', () => {
    const source = renderPagesModule([
      { path: '/b', id: '/b.md', summary: { title: 'B' } },
      { path: '/a', id: '/a.md', summary: { title: 'A' } },
    ])

    expect(source.indexOf('"/b"')).toBeLessThan(source.indexOf('"/a"'))
  })

  it('writes the route path once per record', () => {
    const source = renderPagesModule([
      { path: '/guide/intro', id: '/src/guide/intro.md', summary: { title: 'Intro' } },
    ])

    expect(source.match(/"\/guide\/intro"/g)).toHaveLength(1)
  })

  it('escapes titles that would otherwise break out of the module', () => {
    const source = renderPagesModule([{
      path: '/quotes',
      id: '/src/quotes.md',
      summary: { title: 'He said "hi" \\ and </script>' },
    }])

    expect(source).toContain('title: "He said \\"hi\\" \\\\ and \\u003C/script>"')
    expect(source).not.toContain('</script>')
  })

  it('produces a module that evaluates to the manifest', async () => {
    const source = renderPagesModule([
      { path: '/guide/intro', id: '/src/guide/intro.md', summary: { title: 'Intro' } },
      { path: '/', id: '/src/index.md', summary: { title: 'Home', layout: 'home' } },
    ])
    const module = await import(
      `data:text/javascript,${encodeURIComponent(source)}`,
    ) as { pageManifest: Record<string, { title: string, layout?: string, load: () => unknown }> }

    expect(Object.keys(module.pageManifest)).toEqual(['/guide/intro', '/'])
    expect(module.pageManifest['/']).toMatchObject({ title: 'Home', layout: 'home' })
    expect(module.pageManifest['/guide/intro']?.load).toBeTypeOf('function')
  })
})

describe('virtualPagesPlugin', () => {
  let siteDirectory: string

  beforeEach(async () => {
    siteDirectory = await mkdtemp(join(tmpdir(), 'kawapress-pages-'))
    await mkdir(join(siteDirectory, 'src/guide'), { recursive: true })
    await writeFile(join(siteDirectory, 'src/index.md'), '---\nlayout: home\n---\n\n# Home\n')
    await writeFile(join(siteDirectory, 'src/guide/one.md'), '# One\n')
  })

  afterEach(async () => {
    await rm(siteDirectory, { force: true, recursive: true })
  })

  async function createPlugin() {
    const pageLoader = createMarkdownPageLoader({
      root: siteDirectory,
      base: '/',
      srcDir: 'src',
      pluginRunner: await createGeneratorPluginRunner([]),
    })
    const invalidate = vi.fn()
    const plugin = virtualPagesPlugin({
      srcDir: 'src',
      publicDir: 'public',
      pageLoader,
      pageRoutes: { routes: async () => [], invalidate },
    })
    const load = plugin.load as (id: string) => Promise<string | undefined>

    return {
      invalidate,
      async source() {
        return await load(RESOLVED_ID) ?? ''
      },
      plugin,
    }
  }

  it('keys the manifest by route path and imports the Markdown modules', async () => {
    const { source } = await createPlugin()

    expect(await source()).toBe([
      'export const pageManifest = {',
      '  "/guide/one": { title: "One", load: () => import("/src/guide/one.md") },',
      '  "/": { title: "Home", layout: "home", load: () => import("/src/index.md") },',
      '}',
      '',
    ].join('\n'))
  })

  it('reloads a browser that saw the manifest before a page was added or removed', async () => {
    const { invalidate, plugin } = await createPlugin()
    const server = createFakeDevServer()
    const configureServer = plugin.configureServer as (server: ViteDevServer) => void
    configureServer(server as unknown as ViteDevServer)

    await server.emit('add', join(siteDirectory, 'src/guide/two.md'))
    await server.emit('unlink', join(siteDirectory, 'src/guide/one.md'))
    await server.emit('add', join(siteDirectory, 'notes.txt'))

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(server.invalidateModule).toHaveBeenCalledTimes(2)
    expect(server.send).toHaveBeenCalledTimes(2)
    expect(server.send).toHaveBeenCalledWith({ type: 'full-reload' })
  })

  it('stays quiet about a page change while no browser holds the manifest', async () => {
    const { invalidate, plugin } = await createPlugin()
    const server = createFakeDevServer({ loaded: false })
    const configureServer = plugin.configureServer as (server: ViteDevServer) => void
    configureServer(server as unknown as ViteDevServer)

    await server.emit('add', join(siteDirectory, 'src/guide/two.md'))

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(server.send).not.toHaveBeenCalled()
  })
})

/**
 * The watcher events are asynchronous in Vite, so the fake collects handlers
 * and the test awaits the ones it triggers.
 */
function createFakeDevServer(options: { loaded?: boolean } = {}) {
  const handlers = new Map<string, ((file: string) => void)[]>()
  const virtualModule = { id: RESOLVED_ID }
  const invalidateModule = vi.fn()
  const send = vi.fn()

  return {
    invalidateModule,
    send,
    watcher: {
      on(event: string, handler: (file: string) => void) {
        handlers.set(event, [...handlers.get(event) ?? [], handler])
      },
    },
    moduleGraph: {
      getModuleById: (id: string) => (
        id === RESOLVED_ID && options.loaded !== false ? virtualModule : undefined
      ),
      invalidateModule,
    },
    hot: { send },
    async emit(event: string, file: string) {
      for (const handler of handlers.get(event) ?? []) {
        handler(file)
      }
      // The handlers must stay synchronous: Vite never awaits watcher listeners.
      await Promise.resolve()
    },
  }
}

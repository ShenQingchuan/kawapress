import type { ViteDevServer } from 'vite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMarkdownPageLoader } from '../../../compiler/page-loader'
import { createGeneratorPluginRunner } from '../../../plugin/generator-runner'
import {
  PAGES_MODULE_ID,
  renderBuiltPagesModule,
  renderImportPagesModule,
  virtualPagesPlugin,
} from './pages'

const RESOLVED_ID = `\0${PAGES_MODULE_ID}`

describe('renderImportPagesModule', () => {
  it('writes one loader and one module id per page, keyed by route path', () => {
    const source = renderImportPagesModule([
      { path: '/guide/intro', id: '/src/guide/intro.md' },
      { path: '/', id: '/src/index.md' },
    ])

    expect(source).toBe([
      'export const pages = {',
      '  "/guide/intro": () => import("/src/guide/intro.md"),',
      '  "/": () => import("/src/index.md"),',
      '}',
      'export const pageModules = {',
      '  "/guide/intro": "/src/guide/intro.md",',
      '  "/": "/src/index.md",',
      '}',
      '',
    ].join('\n'))
  })

  it('keeps the order of the pages it is given', () => {
    const source = renderImportPagesModule([
      { path: '/b', id: '/b.md' },
      { path: '/a', id: '/a.md' },
    ])

    expect(source.indexOf('"/b"')).toBeLessThan(source.indexOf('"/a"'))
  })

  it('escapes ids that would otherwise break out of the module', () => {
    const source = renderImportPagesModule([{
      path: '/quotes',
      id: '/src/quo"tes.md',
    }])

    expect(source).toContain('import("/src/quo\\"tes.md")')
  })

  it('produces a module whose loaders import the page', async () => {
    const module = await import(
      `data:text/javascript,${encodeURIComponent(renderImportPagesModule([
        { path: '/guide/intro', id: '/src/guide/intro.md' },
      ]))}`,
    ) as {
      pages: Record<string, () => Promise<unknown>>
      pageModules: Record<string, string>
    }

    expect(Object.keys(module.pages)).toEqual(['/guide/intro'])
    expect(module.pages['/guide/intro']).toBeTypeOf('function')
    expect(module.pageModules['/guide/intro']).toBe('/src/guide/intro.md')
  })
})

describe('renderBuiltPagesModule', () => {
  it('reads the table URL from the HTML and waits for the table before exporting', () => {
    const source = renderBuiltPagesModule()

    expect(source).toContain('readPageTableUrl()')
    expect(source).toContain('await loadPageTable(')
    // A static `import()` would let Vite write a preload dependency table again.
    expect(source).not.toContain('import(')
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
    const load = plugin.load as (
      this: unknown,
      id: string,
    ) => Promise<string | undefined>

    return {
      invalidate,
      plugin,
      /** Source the plugin serves for the dev server and the SSR build. */
      async source() {
        return await load.call(devContext(), RESOLVED_ID) ?? ''
      },
      /** Source the plugin serves for the browser bundle of a build. */
      async browserSource() {
        return await load.call(buildContext('client'), RESOLVED_ID) ?? ''
      },
    }
  }

  it('keys the table by route path and imports the Markdown modules', async () => {
    const { source } = await createPlugin()

    expect(await source()).toBe([
      'export const pages = {',
      '  "/guide/one": () => import("/src/guide/one.md"),',
      '  "/": () => import("/src/index.md"),',
      '}',
      'export const pageModules = {',
      '  "/guide/one": "/src/guide/one.md",',
      '  "/": "/src/index.md",',
      '}',
      '',
    ].join('\n'))
  })

  it('reads the page table file in the browser build instead of importing pages', async () => {
    const { browserSource } = await createPlugin()

    expect(await browserSource()).toContain('loadPageTable')
    expect(await browserSource()).not.toContain('() => import(')
  })

  it('keeps importing pages for the SSR build', async () => {
    const { plugin } = await createPlugin()
    const load = plugin.load as (this: unknown, id: string) => Promise<string | undefined>

    const source = await load.call(buildContext('ssr'), RESOLVED_ID)

    expect(source).toContain('() => import("/src/guide/one.md")')
  })

  it('reloads a browser that saw the table before a page was added or removed', async () => {
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

  it('stays quiet about a page change while no browser holds the table', async () => {
    const { invalidate, plugin } = await createPlugin()
    const server = createFakeDevServer({ loaded: false })
    const configureServer = plugin.configureServer as (server: ViteDevServer) => void
    configureServer(server as unknown as ViteDevServer)

    await server.emit('add', join(siteDirectory, 'src/guide/two.md'))

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(server.send).not.toHaveBeenCalled()
  })
})

function devContext() {
  return { environment: { name: 'client', config: { command: 'serve' } } }
}

function buildContext(environment: 'client' | 'ssr') {
  return { environment: { name: environment, config: { command: 'build' } } }
}

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

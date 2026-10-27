import type { NagiSidebarMetaPluginOptions } from './sidebar-meta-plugin'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  nagiSidebarMetaPlugin,
  SIDEBAR_META_MODULE_ID,
} from './sidebar-meta-plugin'

const RESOLVED_ID = `\0${SIDEBAR_META_MODULE_ID}`

let siteDirectory: string

beforeEach(async () => {
  siteDirectory = await mkdtemp(join(tmpdir(), 'nagi-sidebar-meta-'))
})

afterEach(async () => {
  await rm(siteDirectory, { force: true, recursive: true })
})

async function writePage(file: string, content: string): Promise<void> {
  const path = join(siteDirectory, 'src', file)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, content)
}

async function renderModule(
  options: Partial<NagiSidebarMetaPluginOptions> = {},
): Promise<{ sidebarMeta: unknown, sidebarPages: Record<string, unknown>, source: string }> {
  const plugin = nagiSidebarMetaPlugin({ srcDir: 'src', ...options })
  const resolveConfig = plugin.configResolved as (config: unknown) => void
  resolveConfig({ root: siteDirectory, publicDir: join(siteDirectory, 'src/public') })
  const load = plugin.load as (id: string) => Promise<string | undefined>
  const source = await load(RESOLVED_ID) ?? ''
  const module = await import(
    `data:text/javascript,${encodeURIComponent(source)}`,
  ) as { sidebarMeta: unknown, sidebarPages: Record<string, unknown> }
  return { sidebarMeta: module.sidebarMeta, sidebarPages: module.sidebarPages, source }
}

describe('the automatic sidebar page list', () => {
  it('carries every document page when no sidebar is hand-written', async () => {
    await writePage('index.md', '---\nlayout: home\n---\n\n# Home\n')
    await writePage('about.md', '---\nlayout: page\n---\n\n# About\n')
    await writePage('guide/a.md', '---\ntitle: From frontmatter\n---\n\n# A\n')
    await writePage('guide/b.md', '# Written as a heading\n')
    await writePage('guide/deep/c.md', '---\nlayout: doc\n---\n\n# C\n')

    const { sidebarPages, source } = await renderModule()

    expect(sidebarPages).toEqual({
      '/guide/a': { title: 'From frontmatter' },
      '/guide/b': { title: 'Written as a heading' },
      '/guide/deep/c': { title: 'C', layout: 'doc' },
    })
    // The values are module data, so they are written as escaped JSON.
    expect(source).toContain('export const sidebarPages = {"')
  })

  it('stays empty when every route is covered by a sidebar given as an array', async () => {
    await writePage('guide/a.md', '# A\n')
    await writePage('guide/b.md', '# B\n')

    const { sidebarPages } = await renderModule({
      themeConfig: { sidebar: [{ text: 'Guide', items: [] }] },
    })

    expect(sidebarPages).toEqual({})
  })

  it('keeps only the routes that no sidebar prefix covers', async () => {
    await writePage('guide/a.md', '# A\n')
    await writePage('guide/deep/b.md', '# B\n')
    await writePage('api/intro.md', '# Intro\n')

    const { sidebarPages } = await renderModule({
      themeConfig: {
        sidebar: {
          '/guide/': [{ text: 'Guide', items: [] }],
        },
      },
    })

    expect(sidebarPages).toEqual({ '/api/intro': { title: 'Intro' } })
  })

  it('reads the sidebar of each locale, which replaces the site one', async () => {
    await writePage('notes.md', '# Notes\n')
    await writePage('guide/a.md', '# A\n')
    await writePage('en/guide/b.md', '# B\n')
    await writePage('en/api/c.md', '# C\n')

    const { sidebarPages } = await renderModule({
      themeConfig: {
        sidebar: { '/guide/': [{ text: 'Guide', items: [] }] },
      },
      locales: {
        root: { label: 'English' },
        en: {
          label: 'English',
          themeConfig: { sidebar: { '/en/api/': [{ text: 'API', items: [] }] } },
        },
      },
    })

    expect(sidebarPages).toEqual({
      '/notes': { title: 'Notes' },
      '/en/guide/b': { title: 'B' },
    })
  })

  it('still exports the sidebar metadata of _meta.json files', async () => {
    await writePage('guide/a.md', '# A\n')
    await writePage('guide/_meta.json', '["a"]\n')

    const { sidebarMeta } = await renderModule()

    expect(sidebarMeta).toEqual({ '/guide': ['a'] })
  })
})

describe('dev updates of the module', () => {
  it('replaces the module when a page title changes', async () => {
    await writePage('guide/a.md', '# Old title\n')
    const { plugin, server } = await createLoadedPlugin()
    await writePage('guide/a.md', '# New title\n')

    const modules = await update(plugin, server, join(siteDirectory, 'src/guide/a.md'))

    expect(server.invalidated).toBe(1)
    expect(moduleIds(modules)).toContain(RESOLVED_ID)
  })

  it('keeps the module when only the page body changes', async () => {
    await writePage('guide/a.md', '# Title\n\nFirst text.\n')
    const { plugin, server } = await createLoadedPlugin()
    await writePage('guide/a.md', '# Title\n\nSecond text.\n')

    const modules = await update(plugin, server, join(siteDirectory, 'src/guide/a.md'))

    expect(server.invalidated).toBe(0)
    expect(modules).toBeUndefined()
  })

  it('replaces the module when a layout change takes the page off the list', async () => {
    await writePage('guide/a.md', '# Title\n')
    const { plugin, server } = await createLoadedPlugin()
    await writePage('guide/a.md', '---\nlayout: home\n---\n\n# Title\n')

    const modules = await update(plugin, server, join(siteDirectory, 'src/guide/a.md'))

    expect(server.invalidated).toBe(1)
    expect(moduleIds(modules)).toContain(RESOLVED_ID)
  })
})

/** Module ids of a hot update result, in the order Vite replaces them. */
function moduleIds(modules: unknown[] | undefined): string[] {
  return (modules ?? []).map(module => (module as { id: string }).id)
}

function createFakeServer(): {
  invalidated: number
  modules: { id: string }[]
  sends: unknown[]
  server: unknown
} {
  const state = {
    invalidated: 0,
    modules: [{ id: RESOLVED_ID }],
    sends: [] as unknown[],
    server: undefined as unknown,
  }
  state.server = {
    moduleGraph: {
      getModuleById: (id: string) => state.modules.find(module => module.id === id),
      invalidateModule: () => {
        state.invalidated += 1
      },
    },
    hot: {
      send: (payload: unknown) => state.sends.push(payload),
    },
    watcher: { on: () => {} },
  }
  return state
}

async function createLoadedPlugin(): Promise<{
  plugin: ReturnType<typeof nagiSidebarMetaPlugin>
  server: ReturnType<typeof createFakeServer>
}> {
  const plugin = nagiSidebarMetaPlugin({ srcDir: 'src' })
  const resolveConfig = plugin.configResolved as (config: unknown) => void
  resolveConfig({ root: siteDirectory, publicDir: join(siteDirectory, 'src/public') })
  const load = plugin.load as (id: string) => Promise<string | undefined>
  await load(RESOLVED_ID)
  return { plugin, server: createFakeServer() }
}

async function update(
  plugin: ReturnType<typeof nagiSidebarMetaPlugin>,
  server: ReturnType<typeof createFakeServer>,
  file: string,
): Promise<unknown[] | undefined> {
  const handleHotUpdate = plugin.handleHotUpdate as (
    context: unknown,
  ) => Promise<unknown[] | undefined>
  return handleHotUpdate({
    file,
    modules: [{ id: file }],
    server: server.server,
  })
}

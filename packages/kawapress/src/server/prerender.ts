import type { OutletRegistry } from '../core/outlet'
import type { BuiltPageTable, PageTable } from '../core/page-manifest'
import type { SiteData } from '../core/site'
import type { ClientManifest } from './page-assets'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { consola } from 'consola'
import { withBase } from '../core/base'
import { parseJson, stringifyJson } from '../core/json'
import { NOT_FOUND_ROUTE_PATH } from '../core/not-found'
import { findUnconsumedOutletItems, formatUnconsumedOutletWarnings } from '../core/outlet'
import { pageTableFileName } from '../core/page-manifest'
import { collectPageAssets, collectPageEntry } from './page-assets'
import { renderHtmlTemplate } from './template'

interface RenderResult {
  html: string
  head: string
  htmlAttrs: string
  outlets: string[]
}

interface ServerBundle {
  render: (path: string) => Promise<RenderResult>
  getOutletRegistry: () => OutletRegistry
  pages: PageTable
  /** Route path → module id of the page, as the client manifest knows it. */
  pageModules: Record<string, string>
  site: SiteData
}

export async function prerenderPages(root: string): Promise<void> {
  const distDir = join(root, 'dist')
  const serverEntry = join(distDir, '.server/entry-server.js')
  const { render, getOutletRegistry, pages, pageModules, site } = await import(
    pathToFileURL(serverEntry).href,
  ) as ServerBundle

  const manifest = parseJson<ClientManifest>(
    await readFile(join(distDir, '.vite/manifest.json'), 'utf-8'),
    { label: 'the Vite client manifest' },
  )
  const entry = Object.entries(manifest).find(([, chunk]) => chunk.isEntry)
  if (!entry) {
    throw new Error('KawaPress: no entry chunk found in client manifest.')
  }
  const [entryKey, entryChunk] = entry
  const clientEntryUrl = withBase(entryChunk.file, site.base)

  // The browser needs one table for the whole site, computed from the bundle
  // that was just written: page chunk file names only exist here.
  const pageTable = createPageTable(Object.keys(pages), pageModules, manifest, entryKey)
  const pageTableUrl = await writePageTable(distDir, pageTable, site.base)

  const paths = [...Object.keys(pages), NOT_FOUND_ROUTE_PATH]
  const renderedOutlets = new Set<string>()
  for (const path of paths) {
    const { html, head, htmlAttrs, outlets } = await render(path)
    for (const outlet of outlets) {
      renderedOutlets.add(outlet)
    }
    // The not-found document has no page of its own and preloads the entry only.
    const pageEntry = path === NOT_FOUND_ROUTE_PATH ? undefined : pageTable[path]
    const assets = collectPageAssets(manifest, pageEntry, entryKey)
    const file = join(distDir, pathToHtmlFile(path))
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, renderHtmlTemplate({
      head,
      appHtml: html,
      clientEntryUrl,
      pageTableUrl,
      cssUrls: assets.css.map(css => withBase(css, site.base)),
      modulepreloadUrls: assets.modulepreload.map(js => withBase(js, site.base)),
      htmlAttrs,
      // Only `404.html` is served for URLs that were never rendered, so only it
      // tells the client to hydrate the route it was rendered with.
      notFoundDocument: path === NOT_FOUND_ROUTE_PATH,
    }))
  }
  reportUnconsumedOutlets(getOutletRegistry(), renderedOutlets)
  consola.success(`KawaPress: prerendered ${paths.length} pages`)

  await rm(join(distDir, '.server'), { recursive: true })
  await rm(join(distDir, '.vite'), { recursive: true })
}

/**
 * Page table of the site, read from the client manifest: for every page the
 * chunk it lives in and the extra JS and CSS that chunk needs.
 */
function createPageTable(
  routes: readonly string[],
  pageModules: Record<string, string>,
  manifest: ClientManifest,
  entryKey: string,
): BuiltPageTable {
  const table: BuiltPageTable = {}
  for (const path of routes) {
    const pageModuleId = pageModules[path]
    const entry = pageModuleId === undefined
      ? undefined
      : collectPageEntry(manifest, pageModuleId, entryKey)

    if (entry === undefined) {
      throw new Error(
        `KawaPress: page ${JSON.stringify(path)} is missing from the client build. `
        + `The page table is computed from dist/.vite/manifest.json, so the page's chunk `
        + `has to be part of the client build; check that the page is still a Markdown `
        + `file below srcDir and that no plugin removed it from the build input.`,
      )
    }
    table[path] = entry
  }
  return table
}

/**
 * Writes the page table next to the page chunks and returns the URL the HTML has
 * to point at. The file name carries a hash of its own content, so editing one
 * page revalidates the table and that page only.
 */
async function writePageTable(
  distDir: string,
  table: BuiltPageTable,
  base: string,
): Promise<string> {
  const source = `export default ${stringifyJson(table, {
    label: 'the page table',
    path: 'pages',
  })}\n`
  const hash = createHash('sha256').update(source).digest('base64url').slice(0, 8)
  const relativePath = pageTableFileName(hash)
  const file = join(distDir, relativePath)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, source)
  return withBase(relativePath, base)
}

function reportUnconsumedOutlets(
  registry: OutletRegistry,
  renderedOutlets: Iterable<string>,
): void {
  const unconsumed = findUnconsumedOutletItems(registry, renderedOutlets)
  for (const line of formatUnconsumedOutletWarnings(unconsumed)) {
    consola.warn(line)
  }
}

/** `dist` file of a route path: `/guide/intro` → `guide/intro.html`. */
function pathToHtmlFile(path: string): string {
  const relative = path.replace(/^\/+/, '')
  if (!relative) {
    return 'index.html'
  }
  return path.endsWith('/') ? `${relative}index.html` : `${relative}.html`
}

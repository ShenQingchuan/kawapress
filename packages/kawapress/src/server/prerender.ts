import type { OutletRegistry } from '../core/outlet'
import type { PageManifest } from '../core/page-manifest'
import type { SiteData } from '../core/site'
import type { ClientManifest } from './page-assets'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { consola } from 'consola'
import { withBase } from '../core/base'
import { parseJson } from '../core/json'
import { NOT_FOUND_ROUTE_PATH } from '../core/not-found'
import { findUnconsumedOutletItems, formatUnconsumedOutletWarnings } from '../core/outlet'
import { collectPageAssets } from './page-assets'
import { renderHtmlTemplate } from './template'

interface RenderResult {
  html: string
  head: string
  htmlAttrs: string
  outlets: string[]
  /** Module ids of the page module and every SFC the SSR render used. */
  modules: string[]
}

interface ServerBundle {
  render: (path: string) => Promise<RenderResult>
  getOutletRegistry: () => OutletRegistry
  pageManifest: PageManifest
  site: SiteData
}

export async function prerenderPages(root: string): Promise<void> {
  const distDir = join(root, 'dist')
  const serverEntry = join(distDir, '.server/entry-server.js')
  const { render, getOutletRegistry, pageManifest, site } = await import(
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

  const paths = [...Object.keys(pageManifest), NOT_FOUND_ROUTE_PATH]
  const renderedOutlets = new Set<string>()
  for (const path of paths) {
    const { html, head, htmlAttrs, outlets, modules } = await render(path)
    for (const outlet of outlets) {
      renderedOutlets.add(outlet)
    }
    const assets = collectPageAssets(manifest, modules, entryKey)
    const file = join(distDir, pathToHtmlFile(path))
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, renderHtmlTemplate({
      head,
      appHtml: html,
      clientEntryUrl,
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

function reportUnconsumedOutlets(
  registry: OutletRegistry,
  renderedOutlets: Iterable<string>,
): void {
  const unconsumed = findUnconsumedOutletItems(registry, renderedOutlets)
  for (const line of formatUnconsumedOutletWarnings(unconsumed)) {
    consola.warn(line)
  }
}

function pathToHtmlFile(path: string): string {
  if (path === '/') {
    return 'index.html'
  }
  if (path.endsWith('/')) {
    return `${path.slice(1)}index.html`
  }
  return `${path.slice(1)}.html`
}

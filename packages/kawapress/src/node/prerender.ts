import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { consola } from 'consola'
import { parseJson } from '../json'
import { renderHtmlTemplate } from './template'

interface ClientManifestEntry {
  file: string
  isEntry?: boolean
  css?: string[]
}

interface RenderResult {
  html: string
  head: string
  htmlAttrs: string
}

interface ServerBundle {
  render: (path: string) => Promise<RenderResult>
  pages: Record<string, unknown>
}

export async function prerenderPages(root: string): Promise<void> {
  const distDir = join(root, 'dist')
  const serverEntry = join(distDir, '.server/entry-server.js')
  const { render, pages } = await import(
    pathToFileURL(serverEntry).href,
  ) as ServerBundle

  const manifest = parseJson<Record<string, ClientManifestEntry>>(
    await readFile(join(distDir, '.vite/manifest.json'), 'utf-8'),
    { label: 'the Vite client manifest' },
  )
  const entry = Object.values(manifest).find(chunk => chunk.isEntry)
  if (!entry) {
    throw new Error('KawaPress: no entry chunk found in client manifest.')
  }

  // MVP: link every CSS asset; per-page precision comes later.
  const cssUrls = [...new Set(
    Object
      .values(manifest)
      .flatMap(chunk => chunk.css ?? [])
      .map(file => `/${file}`),
  )]

  const paths = [...Object.keys(pages), '/404']
  for (const path of paths) {
    const { html, head, htmlAttrs } = await render(path)
    const file = join(distDir, pathToHtmlFile(path))
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, renderHtmlTemplate({
      head,
      appHtml: html,
      clientEntryUrl: `/${entry.file}`,
      cssUrls,
      htmlAttrs,
    }))
  }
  consola.success(`KawaPress: prerendered ${paths.length} pages`)

  await rm(join(distDir, '.server'), { recursive: true })
  await rm(join(distDir, '.vite'), { recursive: true })
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

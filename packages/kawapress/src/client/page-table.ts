import type { BuiltPageEntry, BuiltPageTable, PageLoader, PageModule, PageTable } from '../core/page-manifest'
import { withBase } from '../core/base'
import { pageChunkFileName } from '../core/page-chunk'
import { PAGE_TABLE_META } from '../core/page-manifest'

/** Stylesheet requests already started, so a page never loads its CSS twice. */
const styleLoads = new Map<string, Promise<void>>()
/** Module preloads already inserted by the router. */
const preloadedModules = new Set<string>()

/** URL of the page table, taken from the `<meta>` the prerendered HTML carries. */
export function readPageTableUrl(doc: Document = document): string {
  const url = doc
    .querySelector(`meta[name="${PAGE_TABLE_META}"]`)
    ?.getAttribute('content')

  if (!url) {
    throw new Error(
      `KawaPress: the served HTML has no <meta name="${PAGE_TABLE_META}"> tag, `
      + `so the browser cannot find the page table. `
      + `The document was probably not written by kawapress build; `
      + `in dev, the page table comes from the dev server instead.`,
    )
  }
  return url
}

/** Load the built page table and turn it into page loaders. */
export async function loadPageTable(
  url: string,
  base: string,
  doc: Document = document,
): Promise<PageTable> {
  const table = (await import(/* @vite-ignore */ url) as { default: BuiltPageTable }).default
  return createPageTable(table, base, doc)
}

/** Turn the serialised table into the loaders the router runs. */
export function createPageTable(
  table: BuiltPageTable,
  base: string,
  doc: Document = document,
): PageTable {
  return Object.fromEntries(Object.entries(table).map(
    ([path, entry]) => [path, createPageLoader(path, entry, base, doc)],
  ))
}

/**
 * Loader of one built page: the table holds the content hash of the page chunk,
 * the route supplies the rest of its file name. Warming the browser for the
 * chunk and its extra files, then waiting for the page CSS, happens before the
 * import, so the chunk travels in parallel with its stylesheet instead of after
 * it.
 */
export function createPageLoader(
  path: string,
  entry: BuiltPageEntry,
  base: string,
  doc: Document = document,
): PageLoader {
  const [hash, js = [], css = []] = typeof entry === 'string' ? [entry] : entry

  return async () => {
    const url = withBase(pageChunkFileName(path, hash), base)
    for (const href of js) {
      preloadModule(withBase(href, base), doc)
    }
    await Promise.all(css.map(href => loadStyle(withBase(href, base), doc)))
    return await import(/* @vite-ignore */ url) as PageModule
  }
}

/** Insert a module preload once; the later `import()` reuses it. */
export function preloadModule(href: string, doc: Document = document): void {
  if (preloadedModules.has(href)) {
    return
  }
  preloadedModules.add(href)
  if (findLink(doc, 'modulepreload', href)) {
    return
  }
  doc.head.append(createLink(doc, 'modulepreload', href))
}

/**
 * Make sure the stylesheet for `href` is applied. The page CSS of the first
 * document is already in the HTML head, so a page opened directly resolves at
 * once; a client navigation inserts the link and waits for it.
 */
export function loadStyle(href: string, doc: Document = document): Promise<void> {
  const started = styleLoads.get(href)
  if (started) {
    return started
  }

  const link = findLink(doc, 'stylesheet', href) ?? insertStyleLink(href, doc)
  const loading = link.sheet ? Promise.resolve() : waitForStyle(link)
  styleLoads.set(href, loading)
  return loading
}

function insertStyleLink(href: string, doc: Document): HTMLLinkElement {
  const link = createLink(doc, 'stylesheet', href)
  doc.head.append(link)
  return link
}

function createLink(
  doc: Document,
  rel: string,
  href: string,
): HTMLLinkElement {
  const link = doc.createElement('link')
  link.rel = rel
  link.href = href
  return link
}

function findLink(
  doc: Document,
  rel: string,
  href: string,
): HTMLLinkElement | undefined {
  return Array.from(doc.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`))
    .find(link => link.getAttribute('href') === href)
}

/**
 * Resolves on `load` and on `error`: a stylesheet that fails to arrive must not
 * keep the next page from showing.
 */
function waitForStyle(link: HTMLLinkElement): Promise<void> {
  return new Promise<void>((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true })
    link.addEventListener('error', () => resolve(), { once: true })
  })
}

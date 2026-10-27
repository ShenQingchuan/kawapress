/**
 * A chunk of the Vite client manifest. Only the fields page asset collection
 * reads are described; Vite writes more.
 */
export interface ClientManifestEntry {
  file: string
  isEntry?: boolean
  css?: string[]
  /** Manifest keys of chunks this chunk imports statically. */
  imports?: string[]
}

/** The Vite client manifest, keyed by source path relative to the Vite root. */
export type ClientManifest = Record<string, ClientManifestEntry>

export interface PageAssets {
  /** Stylesheet files, entry CSS first, in manifest traversal order. */
  css: string[]
  /** JS files the document needs before it can hydrate. */
  modulepreload: string[]
}

/** Files of one page chunk: its own file, plus what it needs beyond the entry. */
export interface PageChunkAssets {
  /** File name of the page chunk, relative to the build output. */
  file: string
  /** JS files the page needs on top of the entry closure. */
  js: string[]
  /** Stylesheet files the page needs on top of the entry closure. */
  css: string[]
}

/**
 * Files of one page chunk: the chunk itself, plus the JS and CSS it needs beyond
 * what the entry already loads.
 *
 * Everything is read from the final bundle, so no file name is guessed from a
 * route or from an output naming pattern. Modules the page only imports
 * dynamically (a popup component, for example) stay out on purpose: they belong
 * to an interaction, not to the first render.
 */
export function collectPageChunk(
  manifest: ClientManifest,
  pageModuleId: string,
  entryKey: string,
): PageChunkAssets | undefined {
  const key = toManifestKey(pageModuleId)
  const page = manifest[key]
  if (!page) {
    return undefined
  }

  const entry = collectClosure(manifest, [entryKey])
  const own = collectClosure(manifest, [key])

  return {
    file: page.file,
    js: own.files.filter(file => file !== page.file && !entry.files.includes(file)),
    css: own.css.filter(href => !entry.css.includes(href)),
  }
}

/**
 * Assets one document has to preload: everything the entry needs to start, plus
 * the page chunk of the document and its extra dependencies. First paint and a
 * client navigation therefore use the very same dependency set.
 */
export function collectPageAssets(
  manifest: ClientManifest,
  page: PageChunkAssets | undefined,
  entryKey: string,
): PageAssets {
  const assets = collectClosure(manifest, [entryKey])
  const files = [...assets.files]
  const css = [...assets.css]

  if (page !== undefined) {
    files.push(page.file, ...page.js)
    css.push(...page.css)
  }

  // The entry script tag already loads the entry chunk.
  const entryFile = manifest[entryKey]?.file
  return {
    css: unique(css),
    modulepreload: unique(files).filter(file => file !== entryFile),
  }
}

interface ChunkClosure {
  files: string[]
  css: string[]
}

/**
 * Files and stylesheets of the given chunks and their static imports, visited in
 * manifest order. Keys that are not in the manifest are skipped instead of
 * failing the build.
 */
function collectClosure(
  manifest: ClientManifest,
  roots: Iterable<string>,
): ChunkClosure {
  const seen = new Set<string>()
  const files: string[] = []
  const css: string[] = []
  const pending = [...roots]

  for (let index = 0; index < pending.length; index++) {
    const key = pending[index]
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    const chunk = manifest[key]
    if (!chunk) {
      continue
    }
    files.push(chunk.file)
    css.push(...chunk.css ?? [])
    pending.push(...chunk.imports ?? [])
  }

  return { files, css }
}

/**
 * SSR module ids are relative to the Vite root, like manifest keys, but carry a
 * leading slash and use platform separators. Markdown pages keep their `.md`
 * extension in both.
 */
export function toManifestKey(moduleId: string): string {
  return moduleId.replaceAll('\\', '/').replace(/^\/+/, '').replace(/^\.\//, '')
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

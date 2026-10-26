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
  /** JS files the page chunk needs before it can hydrate. */
  modulepreload: string[]
}

/**
 * Picks the client assets one prerendered page needs.
 *
 * `moduleIds` are the module ids the SSR render recorded for the page: the page
 * module plus every SFC it rendered. Only ids that are manifest keys are used;
 * theme components bundled into a shared chunk are not keys and are reached
 * through the chunk `imports` instead. Dynamic imports stay out on purpose so a
 * page does not pay for chunks it only loads on interaction.
 */
export function collectPageAssets(
  manifest: ClientManifest,
  moduleIds: Iterable<string>,
  entryKey: string,
): PageAssets {
  const pageKeys = [...new Set([...moduleIds].map(toManifestKey))]
    .filter(key => Object.hasOwn(manifest, key))

  const css: string[] = []
  walkChunks(manifest, [entryKey], (chunk) => {
    css.push(...chunk.css ?? [])
  })

  const pageFiles: string[] = []
  walkChunks(manifest, pageKeys, (chunk) => {
    css.push(...chunk.css ?? [])
    pageFiles.push(chunk.file)
  })

  // The entry script tag already loads the entry chunk.
  const entryFile = manifest[entryKey]?.file
  const modulepreload = unique(pageFiles)
    .filter(file => file !== entryFile)

  return { css: unique(css), modulepreload }
}

/**
 * Visits a chunk and its static imports, transitively. Keys that are not in the
 * manifest are skipped instead of failing the build.
 */
function walkChunks(
  manifest: ClientManifest,
  roots: Iterable<string>,
  visit: (chunk: ClientManifestEntry) => void,
): void {
  const seen = new Set<string>()
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
    visit(chunk)
    pending.push(...chunk.imports ?? [])
  }
}

/**
 * SSR module ids are relative to the Vite root, like manifest keys, but use
 * platform separators. Markdown pages keep their `.md` extension in both.
 */
function toManifestKey(moduleId: string): string {
  return moduleId.replaceAll('\\', '/').replace(/^\.\//, '')
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

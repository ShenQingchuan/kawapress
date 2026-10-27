/**
 * File names of page chunks. A client build gives every Markdown page an input of
 * its own, so the route decides the name of the chunk and only its content hash
 * is unknown until the bundle is written. That is why the page table stores the
 * hash alone: the browser rebuilds the file name with the function below.
 */

/** Directory below `assets` that holds the page chunks. */
const PAGE_CHUNK_DIRECTORY = 'pages'

/**
 * `entryFileNames` of the client build, in Rollup's pattern syntax. Prerendering
 * compares the names the bundle reports against {@link pageChunkFileName}, so a
 * plugin or a Vite option that changes the layout fails the build instead of
 * shipping a page table that points nowhere.
 */
export const PAGE_CHUNK_FILE_PATTERN = 'assets/[name]-[hash].js'

/**
 * Client build input name of a page, which is also the first half of its chunk
 * file name, for example `pages/guide/intro`.
 */
export function pageInputName(routePath: string): string {
  return routePath === '/'
    ? `${PAGE_CHUNK_DIRECTORY}/index`
    : `${PAGE_CHUNK_DIRECTORY}${routePath}`
}

/** File name of the page chunk of `routePath`, for example `assets/pages/guide/intro-aBcDeFgH.js`. */
export function pageChunkFileName(routePath: string, hash: string): string {
  return `assets/${pageInputName(routePath)}-${hash}.js`
}

/**
 * Content hash inside the file name of a page chunk, or `undefined` when `file`
 * does not follow the layout {@link pageChunkFileName} writes.
 */
export function pageChunkHash(
  routePath: string,
  file: string,
): string | undefined {
  const prefix = `assets/${pageInputName(routePath)}-`
  const suffix = '.js'
  if (!file.startsWith(prefix) || !file.endsWith(suffix)) {
    return undefined
  }

  const hash = file.slice(prefix.length, -suffix.length)
  return hash.length > 0 && !hash.includes('/') ? hash : undefined
}

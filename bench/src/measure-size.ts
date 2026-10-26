import type { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

export type AssetKind = 'js' | 'css'

export interface AssetReference {
  /** File path relative to the build output directory, without base, query or hash. */
  path: string
  kind: AssetKind
}

export interface AssetSize {
  /** Number of asset files that are loaded. */
  files: number
  raw: number
  gzip: number
  brotli: number
}

export interface PageSizeResult {
  /** Route of the measured page. */
  page: string
  /** The HTML document itself. */
  html: AssetSize
  /** First paint scripts: module scripts, module preloads and the chunks they import. */
  js: AssetSize
  /** Stylesheets referenced by the HTML. */
  css: AssetSize
  /** HTML, JS and CSS together: everything one first paint downloads. */
  firstPaint: AssetSize
}

/** Matches one `<script>` or `<link>` tag and captures name and attributes. */
const TAG_RE = /<(script|link)\b([^>]*)>/gi

/** `from './x.js'` of any import or re-export, and the bare `import './x.js'`. */
const SPECIFIER_RE = /(?:\bfrom|(?:^|[^.\w$])import)\s*['"]([^'"]+)['"]/g

const GZIP_LEVEL = 9
const BROTLI_QUALITY = 11

/**
 * Collect the assets a page loads on first paint: module scripts, module preloads
 * and stylesheets referenced by the HTML.
 */
export function findFirstPaintAssets(html: string, base: string): AssetReference[] {
  const assets: AssetReference[] = []
  for (const match of html.matchAll(TAG_RE)) {
    const tag = match[1]!.toLowerCase()
    const attributes = match[2]!

    if (tag === 'script') {
      const src = readAttribute(attributes, 'src')
      if (!src || readAttribute(attributes, 'type')?.toLowerCase() !== 'module') {
        continue
      }
      assets.push({ path: toDistPath(src, base), kind: 'js' })
      continue
    }

    const href = readAttribute(attributes, 'href')
    const relTokens = readAttribute(attributes, 'rel')?.toLowerCase().split(/\s+/) ?? []
    if (!href || relTokens.length === 0) {
      continue
    }
    if (relTokens.includes('modulepreload')) {
      assets.push({ path: toDistPath(href, base), kind: 'js' })
    }
    else if (relTokens.includes('stylesheet')) {
      assets.push({ path: toDistPath(href, base), kind: 'css' })
    }
  }
  return assets
}

/** Extract relative module specifiers (`./x.js`, `../y.js`) from generated JavaScript. */
export function extractRelativeImports(code: string): string[] {
  const specifiers = new Set<string>()
  for (const match of code.matchAll(SPECIFIER_RE)) {
    const specifier = match[1]!
    if (specifier.startsWith('.')) {
      specifiers.add(specifier)
    }
  }
  return [...specifiers]
}

/** Sum raw, gzip and brotli size of the collected assets, split by kind. */
export function summarizeAssets(
  assets: readonly { kind: AssetKind, content: Buffer }[],
): { js: AssetSize, css: AssetSize } {
  const totals: Record<AssetKind, AssetSize> = {
    js: emptySize(),
    css: emptySize(),
  }

  for (const asset of assets) {
    addSize(totals[asset.kind], measureAsset(asset.content))
  }

  return totals
}

/** Add up several size summaries, for example the three kinds of one page. */
export function combineAssetSizes(sizes: readonly AssetSize[]): AssetSize {
  const total = emptySize()
  for (const size of sizes) {
    addSize(total, size)
  }
  return total
}

/** Raw, gzip and brotli size of one file. */
export function measureAsset(content: Buffer): AssetSize {
  return {
    files: 1,
    raw: content.byteLength,
    gzip: gzipSync(content, { level: GZIP_LEVEL }).byteLength,
    brotli: brotliCompressSync(content, {
      params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY },
    }).byteLength,
  }
}

function addSize(total: AssetSize, size: AssetSize): void {
  total.files += size.files
  total.raw += size.raw
  total.gzip += size.gzip
  total.brotli += size.brotli
}

export interface MeasurePageSizeOptions {
  /** Build output directory. */
  distDir: string
  /** HTML file inside the build output directory. */
  htmlFile: string
  /** Public base path of the site. */
  base: string
  /** Route of the page, kept in the result for the report. */
  page: string
}

/**
 * Measure what one first paint of a built page downloads.
 *
 * The HTML document is measured as well, because both generators inline data into it:
 * VitePress ships its page manifest as `__VP_HASH_MAP__` and `__VP_SITE_DATA__` inside
 * the document, so counting only external files would understate it. Module imports of
 * the referenced chunks are followed too, because the browser downloads them for the
 * first paint even when the HTML has no preload hint for them.
 */
export async function measurePageSize(options: MeasurePageSizeOptions): Promise<PageSizeResult> {
  const html = await readFile(join(options.distDir, options.htmlFile))
  const references = findFirstPaintAssets(html.toString('utf-8'), options.base)
  const assets = await collectAssets(options.distDir, references)
  const { js, css } = summarizeAssets(assets)
  const document = measureAsset(html)
  return {
    page: options.page,
    html: document,
    js,
    css,
    firstPaint: combineAssetSizes([document, js, css]),
  }
}

async function collectAssets(
  distDir: string,
  references: readonly AssetReference[],
): Promise<{ kind: AssetKind, content: Buffer }[]> {
  const collected: { kind: AssetKind, content: Buffer }[] = []
  const visited = new Set<string>()
  const queue = [...references]

  while (queue.length > 0) {
    const reference = queue.shift()!
    if (visited.has(reference.path)) {
      continue
    }
    visited.add(reference.path)

    let content: Buffer
    try {
      content = await readFile(join(distDir, reference.path))
    }
    catch {
      throw new Error(
        `Benchmark: ${reference.path} is referenced by the built page but missing in ${distDir}. `
        + 'Delete the build output and run the benchmark again.',
      )
    }
    collected.push({ kind: reference.kind, content })

    if (reference.kind !== 'js') {
      continue
    }
    for (const specifier of extractRelativeImports(content.toString('utf-8'))) {
      queue.push({
        path: resolveRelative(reference.path, specifier),
        kind: kindOfSpecifier(specifier),
      })
    }
  }

  return collected
}

function resolveRelative(fromFile: string, specifier: string): string {
  const target = specifier.split(/[?#]/)[0]!
  const segments = [...fromFile.split('/').slice(0, -1)]
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') {
      continue
    }
    if (segment === '..') {
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments.join('/')
}

function kindOfSpecifier(specifier: string): AssetKind {
  return /\.css(?:[?#]|$)/i.test(specifier) ? 'css' : 'js'
}

function toDistPath(url: string, base: string): string {
  const cleaned = url.split(/[?#]/)[0] ?? ''
  const withoutBase = base !== '/' && cleaned.startsWith(base)
    ? cleaned.slice(base.length)
    : cleaned
  return withoutBase.replace(/^\/+/, '')
}

function readAttribute(attributes: string, name: string): string | undefined {
  const pattern = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'\`=<>]+))`,
    'i',
  )
  const match = attributes.match(pattern)
  if (!match) {
    return undefined
  }
  return match[1] ?? match[2] ?? match[3]
}

function emptySize(): AssetSize {
  return { files: 0, raw: 0, gzip: 0, brotli: 0 }
}

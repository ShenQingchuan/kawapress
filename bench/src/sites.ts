import type { Fixture, FixturePage } from './fixture.ts'
import { readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { GUIDE_DIR, GUIDE_ROUTE_PREFIX } from './fixture.ts'

export type SiteKind = 'kawapress' | 'vitepress'

export const SITE_KINDS: readonly SiteKind[] = ['kawapress', 'vitepress']

export const SITE_LABELS: Record<SiteKind, string> = {
  kawapress: 'KawaPress',
  vitepress: 'VitePress',
}

/** Dev server port used by both tools when started without extra arguments. */
export const DEV_PORT = 5173
/** Preview server port used by both tools. */
export const PREVIEW_PORT = 4173

const SIDEBAR_GROUP_SIZE = 25
const GUIDE_HTML_PAGE = 'guide/page-0001.html'

export interface SitePaths {
  kind: SiteKind
  /** Absolute site root, the working directory for every command. */
  root: string
  /** Directory holding the built HTML output. */
  distDir: string
  /** Caches that must be removed to get a cold start. */
  cacheDirs: string[]
  /** Home page HTML file, relative to `distDir`. */
  homeHtml: string
  /** Guide page HTML file used for size and Lighthouse measurements, relative to `distDir`. */
  guideHtml: string
  buildCommand: string[]
  devCommand: string[]
  previewCommand: string[]
  devPort: number
  previewPort: number
  base: string
}

const require = createRequire(import.meta.url)

function resolvePackageBin(packageName: string): string {
  const manifestPath = require.resolve(`${packageName}/package.json`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
    bin?: string | Record<string, string>
  }
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[packageName]
  if (!bin) {
    throw new Error(
      `Benchmark: package \`${packageName}\` in ${manifestPath} declares no \`bin\` entry, so the benchmark cannot start it.`,
    )
  }
  return resolve(dirname(manifestPath), bin)
}

function defineSitePaths(kind: SiteKind, root: string): SitePaths {
  const shared = {
    kind,
    root,
    homeHtml: 'index.html',
    guideHtml: GUIDE_HTML_PAGE,
    devPort: DEV_PORT,
    previewPort: PREVIEW_PORT,
    base: '/',
    cacheDirs: [join(root, 'node_modules/.vite')],
  }
  const bin = resolvePackageBin(kind)
  const node = process.execPath

  if (kind === 'kawapress') {
    return {
      ...shared,
      distDir: join(root, 'dist'),
      buildCommand: [node, bin, 'build'],
      // `kawapress dev` has no port flag yet, so the benchmark uses its default port.
      devCommand: [node, bin, 'dev'],
      // `kawapress preview` also keeps its default port.
      previewCommand: [node, bin, 'preview'],
    }
  }

  return {
    ...shared,
    distDir: join(root, '.vitepress/dist'),
    cacheDirs: [...shared.cacheDirs, join(root, '.vitepress/cache')],
    buildCommand: [node, bin, 'build'],
    devCommand: [node, bin, 'dev', '--port', String(DEV_PORT), '--strictPort'],
    previewCommand: [node, bin, 'preview', '--port', String(PREVIEW_PORT), '--strictPort'],
  }
}

export interface BenchSites {
  kawapress: SitePaths
  vitepress: SitePaths
}

/**
 * Write both sites from one fixture into `sitesRoot`, usually `bench/.sites`.
 * Existing generated files are removed first, so the content never drifts.
 */
export async function writeSites(fixture: Fixture, sitesRoot: string): Promise<BenchSites> {
  const sizeRoot = join(sitesRoot, String(fixture.size))
  await rm(sizeRoot, { recursive: true, force: true })

  const kawapressRoot = join(sizeRoot, 'kawapress')
  const vitepressRoot = join(sizeRoot, 'vitepress')
  await Promise.all([
    writeKawapressSite(kawapressRoot, fixture),
    writeVitepressSite(vitepressRoot, fixture),
  ])

  return {
    kawapress: defineSitePaths('kawapress', kawapressRoot),
    vitepress: defineSitePaths('vitepress', vitepressRoot),
  }
}

async function writeKawapressSite(root: string, fixture: Fixture): Promise<void> {
  await writeContent(join(root, 'src'), fixture)
  await writeFile(join(root, 'package.json'), sitePackageJson('bench-kawapress'))
  await writeFile(
    join(root, 'kawapress.config.ts'),
    [
      `import { nagi } from 'kawapress/nagi'`,
      '',
      `export default nagi({`,
      `  title: 'Benchmark',`,
      `  srcDir: 'src',`,
      `  themeConfig: {`,
      `    sidebar: ${withIndent(JSON.stringify(createSidebar(fixture.pages), null, 2), 4)},`,
      `  },`,
      `})`,
      '',
    ].join('\n'),
  )
}

async function writeVitepressSite(root: string, fixture: Fixture): Promise<void> {
  await writeContent(join(root, 'src'), fixture)
  await writeFile(join(root, 'package.json'), sitePackageJson('bench-vitepress'))
  await mkdir(join(root, '.vitepress'), { recursive: true })
  await writeFile(
    join(root, '.vitepress/config.mts'),
    [
      `import { defineConfig } from 'vitepress'`,
      '',
      `export default defineConfig({`,
      `  title: 'Benchmark',`,
      `  srcDir: 'src',`,
      `  themeConfig: {`,
      `    sidebar: ${withIndent(JSON.stringify(createSidebar(fixture.pages), null, 2), 4)},`,
      `    search: { provider: 'local' },`,
      `  },`,
      `})`,
      '',
    ].join('\n'),
  )
}

function sitePackageJson(name: string): string {
  return `${JSON.stringify({ name, private: true, type: 'module' }, null, 2)}\n`
}

async function writeContent(contentRoot: string, fixture: Fixture): Promise<void> {
  await mkdir(join(contentRoot, GUIDE_DIR), { recursive: true })
  await Promise.all(
    [fixture.home, ...fixture.pages].map(page => (
      writeFile(join(contentRoot, page.file), page.markdown)
    )),
  )
}

function createSidebar(pages: readonly FixturePage[]) {
  const groups: { text: string, items: { text: string, link: string }[] }[] = []
  for (let start = 0; start < pages.length; start += SIDEBAR_GROUP_SIZE) {
    const slice = pages.slice(start, start + SIDEBAR_GROUP_SIZE)
    const first = String(start + 1).padStart(4, '0')
    const last = String(start + slice.length).padStart(4, '0')
    groups.push({
      text: `${GUIDE_ROUTE_PREFIX.slice(1)} ${first}-${last}`,
      items: slice.map(page => ({ text: page.title, link: page.route })),
    })
  }
  return groups
}

/** Indent every line after the first one, keeping the first line inline. */
function withIndent(json: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return json.replaceAll('\n', `\n${pad}`)
}

/** Remove build output and caches so the next run starts cold. */
export async function clearBuildState(site: SitePaths): Promise<void> {
  await Promise.all(
    [site.distDir, ...site.cacheDirs].map(dir => rm(dir, { recursive: true, force: true })),
  )
}

/** Remove only the caches, keeping the build output that size measurement reads. */
export async function clearCaches(site: SitePaths): Promise<void> {
  await Promise.all(site.cacheDirs.map(dir => rm(dir, { recursive: true, force: true })))
}

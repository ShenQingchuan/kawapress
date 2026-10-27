import type { LighthouseScore } from './measure-lighthouse.ts'
import type { AssetSize, PageSizeResult } from './measure-size.ts'
import type { SiteKind } from './sites.ts'
import { SITE_KINDS, SITE_LABELS } from './sites.ts'

export interface EnvironmentInfo {
  cpuModel: string
  cores: number
  memoryGiB: number
  os: string
  nodeVersion: string
}

export interface ToolVersions {
  kawapressVersion: string
  kawapressGitSha: string
  vitepressVersion: string
  lighthouseVersion?: string
}

export interface Measurement {
  /** Duration of every run in milliseconds, in run order. */
  runsMs: number[]
  medianMs: number
}

export interface DevMeasurement {
  /** Until a headless browser shows the home page heading. */
  contentVisible: Measurement
  /** Until the first HTML response for the home page. */
  firstHtml: Measurement
}

export interface SizeAssets {
  home: PageSizeResult
  guide: PageSizeResult
}

/** What the browser needs on the built site: taking over the HTML and the next page. */
export interface PageLoads {
  /** Until Vue mounted the app of the served document. */
  hydration: Measurement
  /** Until the page of a clicked sidebar link was on screen. */
  clientNavigation: Measurement
}

export interface SizeResult {
  /** Number of guide pages; the home page is additional. */
  size: number
  build: Record<SiteKind, Measurement>
  dev: Record<SiteKind, DevMeasurement>
  browser: Record<SiteKind, PageLoads>
  assets: Record<SiteKind, SizeAssets>
  lighthouse?: Record<SiteKind, LighthouseScore>
}

export interface BenchReport {
  generatedAt: string
  environment: EnvironmentInfo
  tools: ToolVersions
  settings: {
    sizes: number[]
    runs: number
    lighthouse: boolean
  }
  results: SizeResult[]
}

const DEFAULT_CAPABILITIES: { capability: string, kawapress: string, vitepress: string }[] = [
  {
    capability: 'Local search',
    kawapress: 'on, built into the preset',
    vitepress: 'on, local provider set in the fixture config',
  },
  {
    capability: 'LLM artifacts',
    kawapress: 'on, `llms.txt`, `llms-full.txt` and one `.md` per page',
    vitepress: 'none',
  },
  {
    capability: 'Sitemap',
    kawapress: 'off, needs `sitemap.hostname`',
    vitepress: 'off, needs `sitemap.hostname`',
  },
  {
    capability: 'Markdown extras',
    kawapress: 'containers, GitHub alerts, code groups, Shiki with twoslash',
    vitepress: 'containers, code groups, Shiki',
  },
  {
    capability: 'Theme',
    kawapress: 'nagi preset, overlayscrollbars sidebar',
    vitepress: 'default theme',
  },
]

/** Median of the given numbers; returns 0 for an empty list. */
export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
}

export function summarizeRuns(runsMs: readonly number[]): Measurement {
  return { runsMs: [...runsMs], medianMs: median(runsMs) }
}

/** Render a duration, for example `812 ms` or `1.42 s`. */
export function formatDuration(milliseconds: number): string {
  return milliseconds < 1000
    ? `${milliseconds.toFixed(0)} ms`
    : `${(milliseconds / 1000).toFixed(2)} s`
}

/** Render a byte count in kB with one decimal. */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`
}

/** Relative difference of KawaPress against VitePress, in percent. */
export function formatDelta(kawapress: number, vitepress: number): string {
  if (vitepress === 0) {
    return 'n/a'
  }
  const percent = ((kawapress - vitepress) / vitepress) * 100
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

export function formatRuns(runsMs: readonly number[]): string {
  return runsMs.map(run => formatDuration(run)).join(', ')
}

/** Render a byte count, staying in bytes below 1 kB so a per-page cost stays readable. */
export function formatByteCount(bytes: number): string {
  return Math.abs(bytes) < 1024 ? `${bytes.toFixed(1)} B` : formatBytes(bytes)
}

/**
 * Bytes one extra page adds: the difference between the largest and the smallest
 * measured size, divided by the page difference. `undefined` when fewer than two
 * distinct sizes were measured, because one size cannot show growth.
 */
export function perExtraPage(
  values: readonly { size: number, bytes: number }[],
): number | undefined {
  const sorted = [...values].sort((left, right) => left.size - right.size)
  const smallest = sorted[0]
  const largest = sorted[sorted.length - 1]
  if (sorted.length < 2 || !smallest || !largest) {
    return undefined
  }
  const pages = largest.size - smallest.size
  if (pages <= 0) {
    return undefined
  }
  return (largest.bytes - smallest.bytes) / pages
}

function formatAssetSize(size: AssetSize): string {
  return `${formatBytes(size.raw)} / ${formatBytes(size.gzip)} / ${formatBytes(size.brotli)}`
}

/**
 * HTML and JS of the guide page, the part of a page that grows with the page count:
 * both generators ship a page manifest next to the page itself.
 */
function guideHtmlAndJsGzip(result: SizeResult, kind: SiteKind): number {
  const { html, js } = result.assets[kind].guide
  return html.gzip + js.gzip
}

function table(header: readonly string[], rows: readonly (readonly string[])[]): string[] {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.join(' | ')} |`),
  ]
}

/**
 * Render the report as Markdown: environment, method, default capabilities,
 * then one comparison table per content size.
 */
export function formatReport(report: BenchReport): string {
  const lines: string[] = [
    '# KawaPress vs VitePress benchmark',
    '',
    `Generated at ${report.generatedAt} by \`pnpm bench\` on a single machine.`,
    'Both sites are written from the same seeded fixture (`bench/src/fixture.ts`), so only the generator differs.',
    'A size is the number of guide pages; the home page is generated in addition to them.',
    '',
    '## Machine',
    '',
    ...table(['Item', 'Value'], [
      ['CPU', report.environment.cpuModel],
      ['Cores', String(report.environment.cores)],
      ['RAM', `${report.environment.memoryGiB} GiB`],
      ['OS', report.environment.os],
      ['Node', report.environment.nodeVersion],
      ['KawaPress', `${report.tools.kawapressVersion} (git ${report.tools.kawapressGitSha})`],
      ['VitePress', report.tools.vitepressVersion],
      ['Lighthouse', report.tools.lighthouseVersion ?? 'not run'],
    ]),
    '',
    '## How to read the numbers',
    '',
    '- **Cold build**: build output and Vite caches are deleted before every run. The median of all runs is reported together with every single run.',
    '- **Dev ready**: the dev server is started, then a headless Chromium opens `/` and the run ends once the home page heading is on screen. The page is retried until the server answers. VitePress dev answers with an empty shell and renders in the browser, so this is the time a reader actually waits. Caches are deleted before every run.',
    '- **Dev first HTML response**: recorded on the same page load as `Dev ready`, at the moment the HTML document for `/` arrived. It is kept because older reports used it; on its own it flatters tools that send a shell and paint later, so compare `Dev ready`. Reports written before the browser measurement are not comparable with these numbers.',
    '- **First paint size**: the built home page and one guide page are measured. The HTML document itself plus every module script, module preload and stylesheet it references are counted, and relative imports of those chunks are followed because the browser downloads them too. The document is included because both generators inline data into it, VitePress its page manifest for example. `HTML + JS + CSS` is everything one first paint downloads; the rows below it break that down. Raw, gzip (level 9) and brotli (quality 11).',
    '- **Hydration done / Client navigation**: measured on the built site, served by each tool\'s own preview command, in a headless Chromium with a fresh context per run. `Hydration done` starts at the document navigation and ends when Vue marks the container as mounted (`__vue_app__`), a mark both tools set inside `app.mount()`, so neither build output is patched. `Client navigation` clicks the sidebar link of the next page and ends when that page\'s heading is on screen; the page itself watches for it per animation frame, and every run navigates three times and reports the median, because a single navigation of a local site is small enough to drown in scheduler noise.',
    '- **Per extra page**: how many bytes one more page adds, taken from the smallest and the largest size of this run: the difference of the guide page\'s HTML and JS, divided by the page difference.',
    '- **Lighthouse**: desktop preset, performance and accessibility of the home page, served by each tool\'s own preview command. Runs only with `--lighthouse`.',
    '- **Δ**: relative difference of KawaPress against VitePress, of the median duration or of the gzip size for the size rows. Negative means KawaPress is smaller or faster.',
    '',
    '## What each side enables by default',
    '',
    ...table(['Capability', 'KawaPress', 'VitePress'], DEFAULT_CAPABILITIES.map(item => [
      item.capability,
      item.kawapress,
      item.vitepress,
    ])),
    '',
  ]

  for (const result of report.results) {
    const runs = report.settings.runs
    const rows: string[][] = [
      medianRow('Cold build', result.build, runs),
      allRunsRow('Cold build, all runs', result.build),
      medianRow('Dev ready', pickDev(result.dev, 'contentVisible'), runs),
      allRunsRow('Dev ready, all runs', pickDev(result.dev, 'contentVisible')),
      medianRow('Dev first HTML response', pickDev(result.dev, 'firstHtml'), runs),
      allRunsRow('Dev first HTML response, all runs', pickDev(result.dev, 'firstHtml')),
      medianRow('Hydration done', pickPageLoads(result.browser, 'hydration'), runs),
      allRunsRow('Hydration done, all runs', pickPageLoads(result.browser, 'hydration')),
      medianRow('Client navigation', pickPageLoads(result.browser, 'clientNavigation'), runs),
      allRunsRow('Client navigation, all runs', pickPageLoads(result.browser, 'clientNavigation')),
      assetRow('Home page first paint, HTML + JS + CSS, raw / gzip / brotli', result.assets, 'home', size => size.firstPaint, true),
      assetRow('Home page HTML, raw / gzip / brotli', result.assets, 'home', size => size.html),
      assetRow('Home page JS, raw / gzip / brotli', result.assets, 'home', size => size.js),
      assetRow('Home page CSS, raw / gzip / brotli', result.assets, 'home', size => size.css),
      assetRow('Guide page first paint, HTML + JS + CSS, raw / gzip / brotli', result.assets, 'guide', size => size.firstPaint, true),
      assetRow('Guide page HTML, raw / gzip / brotli', result.assets, 'guide', size => size.html),
      assetRow('Guide page JS, raw / gzip / brotli', result.assets, 'guide', size => size.js),
      assetRow('Guide page CSS, raw / gzip / brotli', result.assets, 'guide', size => size.css),
    ]

    if (result.lighthouse) {
      rows.push(
        [
          'Lighthouse performance',
          ...SITE_KINDS.map(kind => String(result.lighthouse![kind].performance)),
          formatDelta(result.lighthouse.kawapress.performance, result.lighthouse.vitepress.performance),
        ],
        [
          'Lighthouse accessibility',
          ...SITE_KINDS.map(kind => String(result.lighthouse![kind].accessibility)),
          formatDelta(result.lighthouse.kawapress.accessibility, result.lighthouse.vitepress.accessibility),
        ],
      )
    }

    lines.push(
      `## ${result.size} guide pages (+1 home)`,
      '',
      ...table(
        ['Metric', SITE_LABELS.kawapress, SITE_LABELS.vitepress, 'Δ (KawaPress vs VitePress)'],
        rows,
      ),
      '',
    )
  }

  const growth = perExtraPageSection(report.results)
  if (growth.length > 0) {
    lines.push(
      '## Per extra page',
      '',
      'How many bytes one more page adds to a guide page load, measured between the smallest and the largest size above.',
      '',
      ...growth,
      '',
    )
  }

  return `${lines.join('\n').trimEnd()}\n`
}

function medianRow(label: string, values: Record<SiteKind, Measurement>, runs: number): string[] {
  return [
    `${label}, median of ${runs} ${runs === 1 ? 'run' : 'runs'}`,
    formatDuration(values.kawapress.medianMs),
    formatDuration(values.vitepress.medianMs),
    formatDelta(values.kawapress.medianMs, values.vitepress.medianMs),
  ]
}

function allRunsRow(label: string, values: Record<SiteKind, Measurement>): string[] {
  return [
    label,
    formatRuns(values.kawapress.runsMs),
    formatRuns(values.vitepress.runsMs),
    '',
  ]
}

function pickDev(
  dev: Record<SiteKind, DevMeasurement>,
  metric: keyof DevMeasurement,
): Record<SiteKind, Measurement> {
  return { kawapress: dev.kawapress[metric], vitepress: dev.vitepress[metric] }
}

function pickPageLoads(
  loads: Record<SiteKind, PageLoads>,
  metric: keyof PageLoads,
): Record<SiteKind, Measurement> {
  return { kawapress: loads.kawapress[metric], vitepress: loads.vitepress[metric] }
}

/** One size row; the delta compares gzip, the number a visitor actually downloads. */
function assetRow(
  label: string,
  assets: Record<SiteKind, SizeAssets>,
  page: keyof SizeAssets,
  pick: (size: PageSizeResult) => AssetSize,
  withDelta = false,
): string[] {
  const kawapress = pick(assets.kawapress[page])
  const vitepress = pick(assets.vitepress[page])
  return [
    label,
    formatAssetSize(kawapress),
    formatAssetSize(vitepress),
    withDelta ? formatDelta(kawapress.gzip, vitepress.gzip) : '',
  ]
}

function perExtraPageSection(results: readonly SizeResult[]): string[] {
  const kawapress = perExtraPage(results.map(result => ({
    size: result.size,
    bytes: guideHtmlAndJsGzip(result, 'kawapress'),
  })))
  const vitepress = perExtraPage(results.map(result => ({
    size: result.size,
    bytes: guideHtmlAndJsGzip(result, 'vitepress'),
  })))
  if (kawapress === undefined || vitepress === undefined) {
    return []
  }

  const sizes = results.map(result => result.size).sort((left, right) => left - right)
  return table(['Metric', SITE_LABELS.kawapress, SITE_LABELS.vitepress, 'Δ (KawaPress vs VitePress)'], [
    [
      `Guide page HTML + JS, gzip, per extra page (${sizes[0]} → ${sizes[sizes.length - 1]} pages)`,
      formatByteCount(kawapress),
      formatByteCount(vitepress),
      formatDelta(kawapress, vitepress),
    ],
  ])
}

export function formatReportJson(report: BenchReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}

/** File name shared by the Markdown and JSON result, `<date>-<shortsha>`. */
export function reportFileBaseName(report: BenchReport): string {
  const date = report.generatedAt.slice(0, 10)
  const sha = report.tools.kawapressGitSha.replace(/-dirty$/, '') || 'unknown'
  return `${date}-${sha}`
}

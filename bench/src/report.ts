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

export interface SizeResult {
  /** Number of guide pages; the home page is additional. */
  size: number
  build: Record<SiteKind, Measurement>
  dev: Record<SiteKind, Measurement>
  assets: Record<SiteKind, { home: PageSizeResult, guide: PageSizeResult }>
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

function formatAssetSize(size: AssetSize): string {
  return `${formatBytes(size.raw)} / ${formatBytes(size.gzip)} / ${formatBytes(size.brotli)}`
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
    '- **Dev ready**: time from starting the dev server to the first HTML response for `/`. Caches are deleted before every run.',
    '- **First paint size**: the built home page and one guide page are parsed; every module script, module preload and stylesheet is collected, and relative imports of those chunks are followed because the browser downloads them too. Raw, gzip (level 9) and brotli (quality 11) sizes are summed for JS and CSS separately.',
    '- **Lighthouse**: desktop preset, performance and accessibility of the home page, served by each tool\'s own preview command. Runs only with `--lighthouse`.',
    '- **Δ**: relative difference of KawaPress against VitePress. Negative means KawaPress is smaller or faster.',
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
      [
        `Cold build, median of ${runs} ${runs === 1 ? 'run' : 'runs'}`,
        ...SITE_KINDS.map(kind => formatDuration(result.build[kind].medianMs)),
        formatDelta(result.build.kawapress.medianMs, result.build.vitepress.medianMs),
      ],
      [
        'Cold build, all runs',
        ...SITE_KINDS.map(kind => formatRuns(result.build[kind].runsMs)),
        '',
      ],
      [
        `Dev ready, median of ${runs} ${runs === 1 ? 'run' : 'runs'}`,
        ...SITE_KINDS.map(kind => formatDuration(result.dev[kind].medianMs)),
        formatDelta(result.dev.kawapress.medianMs, result.dev.vitepress.medianMs),
      ],
      [
        'Dev ready, all runs',
        ...SITE_KINDS.map(kind => formatRuns(result.dev[kind].runsMs)),
        '',
      ],
      [
        'Home page JS, raw / gzip / brotli',
        ...SITE_KINDS.map(kind => formatAssetSize(result.assets[kind].home.js)),
        '',
      ],
      [
        'Home page CSS, raw / gzip / brotli',
        ...SITE_KINDS.map(kind => formatAssetSize(result.assets[kind].home.css)),
        '',
      ],
      [
        'Guide page JS, raw / gzip / brotli',
        ...SITE_KINDS.map(kind => formatAssetSize(result.assets[kind].guide.js)),
        '',
      ],
      [
        'Guide page CSS, raw / gzip / brotli',
        ...SITE_KINDS.map(kind => formatAssetSize(result.assets[kind].guide.css)),
        '',
      ],
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

  return `${lines.join('\n').trimEnd()}\n`
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

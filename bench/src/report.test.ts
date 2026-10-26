import type { AssetSize, PageSizeResult } from './measure-size.ts'
import type { BenchReport, SizeResult } from './report.ts'
import { describe, expect, it } from 'vitest'
import { combineAssetSizes } from './measure-size.ts'
import {
  formatByteCount,
  formatBytes,
  formatDelta,
  formatDuration,
  formatReport,
  formatReportJson,
  median,
  perExtraPage,
  reportFileBaseName,
  summarizeRuns,
} from './report.ts'

const HTML_SIZE: AssetSize = { files: 1, raw: 20_000, gzip: 6_000, brotli: 5_000 }
const JS_SIZE: AssetSize = { files: 3, raw: 120_000, gzip: 40_000, brotli: 34_000 }
const CSS_SIZE: AssetSize = { files: 1, raw: 12_000, gzip: 4_000, brotli: 3_500 }

/** Guide page HTML gzip for the two sizes of the growth report. */
const GUIDE_HTML_GZIP: Record<number, { kawapress: number, vitepress: number }> = {
  50: { kawapress: 6_000, vitepress: 8_000 },
  500: { kawapress: 7_500, vitepress: 9_800 },
}

function pageSize(page: string, htmlGzip = HTML_SIZE.gzip): PageSizeResult {
  const html = { ...HTML_SIZE, gzip: htmlGzip }
  return {
    page,
    html,
    js: JS_SIZE,
    css: CSS_SIZE,
    firstPaint: combineAssetSizes([html, JS_SIZE, CSS_SIZE]),
  }
}

function sizeResult(size: number): SizeResult {
  const growth = GUIDE_HTML_GZIP[size]!
  return {
    size,
    build: {
      kawapress: summarizeRuns([21_000, 20_000, 22_000]),
      vitepress: summarizeRuns([18_000, 19_000, 17_000]),
    },
    dev: {
      kawapress: {
        contentVisible: summarizeRuns([3_200, 3_000, 3_100]),
        firstHtml: summarizeRuns([1_400, 1_300, 1_500]),
      },
      vitepress: {
        contentVisible: summarizeRuns([2_100, 2_000, 2_200]),
        firstHtml: summarizeRuns([900, 800, 1_000]),
      },
    },
    assets: {
      kawapress: {
        home: pageSize('/'),
        guide: pageSize('/guide/page-0001', growth.kawapress),
      },
      vitepress: {
        home: pageSize('/'),
        guide: pageSize('/guide/page-0001', growth.vitepress),
      },
    },
  }
}

function createReport(
  overrides: { lighthouse?: boolean, sizes?: number[], runs?: number } = {},
): BenchReport {
  const lighthouse = overrides.lighthouse ?? false
  const sizes = overrides.sizes ?? [50]
  return {
    generatedAt: '2026-02-03T10:20:30.000Z',
    environment: {
      cpuModel: 'Test CPU',
      cores: 12,
      memoryGiB: 36,
      os: 'Darwin 25.0.0 (arm64)',
      nodeVersion: 'v26.10.0',
    },
    tools: {
      kawapressVersion: '0.0.1',
      kawapressGitSha: 'abc1234-dirty',
      vitepressVersion: '1.6.4',
      ...(lighthouse ? { lighthouseVersion: '12.8.2' } : {}),
    },
    settings: { sizes, runs: overrides.runs ?? 3, lighthouse },
    results: sizes.map(size => ({
      ...sizeResult(size),
      ...(lighthouse
        ? {
            lighthouse: {
              kawapress: { performance: 95, accessibility: 100 },
              vitepress: { performance: 98, accessibility: 100 },
            },
          }
        : {}),
    })),
  }
}

describe('statistics and formatting helpers', () => {
  it('computes the median of odd and even run counts', () => {
    expect(median([21_000, 20_000, 22_000])).toBe(21_000)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBe(0)
  })

  it('summarizes runs without losing the individual values', () => {
    expect(summarizeRuns([3, 1, 2])).toEqual({ runsMs: [3, 1, 2], medianMs: 2 })
  })

  it('formats durations, bytes and deltas', () => {
    expect(formatDuration(812)).toBe('812 ms')
    expect(formatDuration(1420)).toBe('1.42 s')
    expect(formatBytes(1536)).toBe('1.5 kB')
    expect(formatByteCount(3.333)).toBe('3.3 B')
    expect(formatByteCount(2048)).toBe('2.0 kB')
    expect(formatDelta(120, 100)).toBe('+20.0%')
    expect(formatDelta(80, 100)).toBe('-20.0%')
    expect(formatDelta(10, 0)).toBe('n/a')
  })

  it('divides the growth between the smallest and the largest size', () => {
    expect(perExtraPage([
      { size: 500, bytes: 52_500 },
      { size: 50, bytes: 46_000 },
    ])).toBe((52_500 - 46_000) / 450)
  })

  it('reports no growth when one size cannot show it', () => {
    expect(perExtraPage([])).toBeUndefined()
    expect(perExtraPage([{ size: 50, bytes: 46_000 }])).toBeUndefined()
    expect(perExtraPage([{ size: 50, bytes: 46_000 }, { size: 50, bytes: 48_000 }]))
      .toBeUndefined()
  })
})

describe('formatReport', () => {
  it('renders the environment, the method and one table per size', () => {
    const markdown = formatReport(createReport())
    expect(markdown).toContain('# KawaPress vs VitePress benchmark')
    expect(markdown).toContain('| Test CPU |')
    expect(markdown).toContain('| KawaPress | 0.0.1 (git abc1234-dirty) |')
    expect(markdown).toContain('## What each side enables by default')
    expect(markdown).toContain('| Local search |')
    expect(markdown).toContain('## 50 guide pages (+1 home)')
    expect(markdown).toContain('| Cold build, median of 3 runs | 21.00 s | 18.00 s | +16.7% |')
    expect(markdown).toContain('| Cold build, all runs | 21.00 s, 20.00 s, 22.00 s |')
    expect(markdown).not.toContain('Lighthouse performance')
  })

  it('reports the browser based dev ready metric next to the first HTML response', () => {
    const markdown = formatReport(createReport())
    expect(markdown).toContain('| Dev ready, median of 3 runs | 3.10 s | 2.10 s | +47.6% |')
    expect(markdown).toContain('| Dev ready, all runs | 3.20 s, 3.00 s, 3.10 s | 2.10 s, 2.00 s, 2.20 s |')
    expect(markdown).toContain('| Dev first HTML response, median of 3 runs | 1.40 s | 900 ms | +55.6% |')
    expect(markdown).toContain('| Dev first HTML response, all runs | 1.40 s, 1.30 s, 1.50 s |')
  })

  it('counts the HTML document into the first paint size', () => {
    const markdown = formatReport(createReport())
    expect(markdown).toContain('| Home page first paint, HTML + JS + CSS, raw / gzip / brotli | 148.4 kB / 48.8 kB / 41.5 kB | 148.4 kB / 48.8 kB / 41.5 kB | 0.0% |')
    expect(markdown).toContain('| Home page HTML, raw / gzip / brotli | 19.5 kB / 5.9 kB / 4.9 kB | 19.5 kB / 5.9 kB / 4.9 kB |')
    expect(markdown).toContain('| Guide page first paint, HTML + JS + CSS, raw / gzip / brotli | 148.4 kB / 48.8 kB / 41.5 kB |')
    expect(markdown).toContain('| Guide page HTML, raw / gzip / brotli | 19.5 kB / 5.9 kB / 4.9 kB |')
    expect(markdown).toContain('| Home page JS, raw / gzip / brotli | 117.2 kB / 39.1 kB / 33.2 kB |')
    expect(markdown).toContain('| Home page CSS, raw / gzip / brotli | 11.7 kB / 3.9 kB / 3.4 kB |')
  })

  it('adds the Lighthouse rows when Lighthouse ran', () => {
    const markdown = formatReport(createReport({ lighthouse: true }))
    expect(markdown).toContain('| Lighthouse | 12.8.2 |')
    expect(markdown).toContain('| Lighthouse performance | 95 | 98 | -3.1% |')
    expect(markdown).toContain('| Lighthouse accessibility | 100 | 100 | 0.0% |')
  })

  it('summarizes the bytes one extra page adds when several sizes ran', () => {
    const markdown = formatReport(createReport({ sizes: [50, 500] }))
    expect(markdown).toContain('## Per extra page')
    expect(markdown).toContain(
      '| Guide page HTML + JS, gzip, per extra page (50 → 500 pages) | 3.3 B | 4.0 B | -16.7% |',
    )
  })

  it('skips the growth summary for a single size', () => {
    expect(formatReport(createReport())).not.toContain('## Per extra page')
  })

  it('writes valid JSON that keeps every run', () => {
    const report = createReport({ lighthouse: true })
    const parsed = JSON.parse(formatReportJson(report)) as BenchReport
    expect(parsed).toEqual(report)
    expect(parsed.results[0]!.build.kawapress.runsMs).toEqual([21_000, 20_000, 22_000])
    expect(parsed.results[0]!.dev.kawapress.contentVisible.runsMs).toEqual([3_200, 3_000, 3_100])
  })
})

describe('reportFileBaseName', () => {
  it('combines the run date with the short sha', () => {
    expect(reportFileBaseName(createReport())).toBe('2026-02-03-abc1234')
  })
})

import type { AssetSize, PageSizeResult } from './measure-size.ts'
import type { BenchReport } from './report.ts'
import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDelta,
  formatDuration,
  formatReport,
  formatReportJson,
  median,
  reportFileBaseName,
  summarizeRuns,
} from './report.ts'

const JS_SIZE: AssetSize = { files: 3, raw: 120_000, gzip: 40_000, brotli: 34_000 }
const CSS_SIZE: AssetSize = { files: 1, raw: 12_000, gzip: 4_000, brotli: 3_500 }

function pageSize(page: string): PageSizeResult {
  return { page, js: JS_SIZE, css: CSS_SIZE }
}

function createReport(overrides: { lighthouse?: boolean } = {}): BenchReport {
  const lighthouse = overrides.lighthouse ?? false
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
    settings: { sizes: [50], runs: 3, lighthouse },
    results: [
      {
        size: 50,
        build: {
          kawapress: summarizeRuns([21_000, 20_000, 22_000]),
          vitepress: summarizeRuns([18_000, 19_000, 17_000]),
        },
        dev: {
          kawapress: summarizeRuns([3_200, 3_000, 3_100]),
          vitepress: summarizeRuns([1_100, 1_000, 1_200]),
        },
        assets: {
          kawapress: { home: pageSize('/'), guide: pageSize('/guide/page-0001') },
          vitepress: { home: pageSize('/'), guide: pageSize('/guide/page-0001') },
        },
        ...(lighthouse
          ? {
              lighthouse: {
                kawapress: { performance: 95, accessibility: 100 },
                vitepress: { performance: 98, accessibility: 100 },
              },
            }
          : {}),
      },
    ],
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
    expect(formatDelta(120, 100)).toBe('+20.0%')
    expect(formatDelta(80, 100)).toBe('-20.0%')
    expect(formatDelta(10, 0)).toBe('n/a')
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
    expect(markdown).toContain('| Home page JS, raw / gzip / brotli | 117.2 kB / 39.1 kB / 33.2 kB |')
    expect(markdown).not.toContain('Lighthouse performance')
  })

  it('adds the Lighthouse rows when Lighthouse ran', () => {
    const markdown = formatReport(createReport({ lighthouse: true }))
    expect(markdown).toContain('| Lighthouse | 12.8.2 |')
    expect(markdown).toContain('| Lighthouse performance | 95 | 98 | -3.1% |')
    expect(markdown).toContain('| Lighthouse accessibility | 100 | 100 | 0.0% |')
  })

  it('writes valid JSON that keeps every run', () => {
    const report = createReport({ lighthouse: true })
    const parsed = JSON.parse(formatReportJson(report)) as BenchReport
    expect(parsed).toEqual(report)
    expect(parsed.results[0]!.build.kawapress.runsMs).toEqual([21_000, 20_000, 22_000])
  })
})

describe('reportFileBaseName', () => {
  it('combines the run date with the short sha', () => {
    expect(reportFileBaseName(createReport())).toBe('2026-02-03-abc1234')
  })
})

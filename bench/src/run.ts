import type { FixturePage } from './fixture.ts'
import type { LighthouseScore } from './measure-lighthouse.ts'
import type { PageSizeResult } from './measure-size.ts'
import type { BenchReport, DevMeasurement, Measurement, PageLoads, SizeResult } from './report.ts'
import type { SiteKind, SitePaths } from './sites.ts'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { parseArgs, USAGE } from './args.ts'
import { readEnvironment, readToolVersions } from './environment.ts'
import { createFixture, HOME_HERO_NAME } from './fixture.ts'
import { measureColdBuild } from './measure-build.ts'
import { measureDevReady } from './measure-dev.ts'
import { measureLighthouse } from './measure-lighthouse.ts'
import { measurePageLoads } from './measure-page-load.ts'
import { measurePageSize } from './measure-size.ts'
import {
  formatBytes,
  formatDuration,
  formatReport,
  formatReportJson,
  reportFileBaseName,
  summarizeRuns,
} from './report.ts'
import { SITE_KINDS, SITE_LABELS, writeSites } from './sites.ts'

interface SiteMeasurement {
  build: Measurement
  dev: DevMeasurement
  browser: PageLoads
  assets: { home: PageSizeResult, guide: PageSizeResult }
  lighthouse?: LighthouseScore
}

interface MeasureSiteOptions {
  runs: number
  lighthouse: boolean
  /** The page a run starts on, which is also the page the size measurement reads. */
  startPage: FixturePage
  /** The page the sidebar link of the benchmark clicks. */
  targetPage: FixturePage
}

function log(message: string): void {
  consola.log(`[bench] ${message}`)
}

async function measureSite(
  site: SitePaths,
  options: MeasureSiteOptions,
): Promise<SiteMeasurement> {
  const { runs, lighthouse } = options
  const label = SITE_LABELS[site.kind]

  log(`${label}: cold build, ${runs} run(s)`)
  const buildRuns = await measureColdBuild(site, {
    runs,
    onRun: ({ run, durationMs }) => log(`  run ${run}: ${formatDuration(durationMs)}`),
  })

  log(`${label}: dev ready, ${runs} run(s)`)
  const devRuns = await measureDevReady(site, {
    runs,
    expectHeading: HOME_HERO_NAME,
    onRun: ({ run, contentVisibleMs, firstHtmlMs }) => log(
      `  run ${run}: ${formatDuration(contentVisibleMs)} until visible, `
      + `${formatDuration(firstHtmlMs)} until the first HTML response`,
    ),
  })

  log(`${label}: hydration and client navigation, ${runs} run(s)`)
  const pageLoadRuns = await measurePageLoads(site, {
    runs,
    startRoute: options.startPage.route,
    targetRoute: options.targetPage.route,
    expectHeading: options.targetPage.title,
    base: site.base,
    onRun: ({ run, hydrationMs, clientNavigationMs }) => log(
      `  run ${run}: ${formatDuration(hydrationMs)} until the app was mounted, `
      + `${formatDuration(clientNavigationMs)} until the next page was readable`,
    ),
  })

  const home = await measurePageSize({
    distDir: site.distDir,
    htmlFile: site.homeHtml,
    base: site.base,
    page: '/',
  })
  const guide = await measurePageSize({
    distDir: site.distDir,
    htmlFile: site.guideHtml,
    base: site.base,
    page: '/guide/page-0001',
  })
  log(
    `${label}: home first paint ${formatBytes(home.firstPaint.raw)} raw / ${formatBytes(home.firstPaint.gzip)} gzip, `
    + `guide first paint ${formatBytes(guide.firstPaint.gzip)} gzip`,
  )

  const measurement: SiteMeasurement = {
    build: summarizeRuns(buildRuns),
    dev: {
      contentVisible: summarizeRuns(devRuns.map(run => run.contentVisibleMs)),
      firstHtml: summarizeRuns(devRuns.map(run => run.firstHtmlMs)),
    },
    browser: {
      hydration: summarizeRuns(pageLoadRuns.map(run => run.hydrationMs)),
      clientNavigation: summarizeRuns(pageLoadRuns.map(run => run.clientNavigationMs)),
    },
    assets: { home, guide },
  }

  if (lighthouse) {
    log(`${label}: Lighthouse on the home page`)
    measurement.lighthouse = await measureLighthouse(site)
    log(`  performance ${measurement.lighthouse.performance}, accessibility ${measurement.lighthouse.accessibility}`)
  }

  return measurement
}

function byKind<T>(entries: readonly (readonly [SiteKind, T])[]): Record<SiteKind, T> {
  return Object.fromEntries(entries) as Record<SiteKind, T>
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    consola.log(USAGE)
    return
  }

  const options = parseArgs(argv)
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const sitesRoot = join(repoRoot, 'bench/.sites')
  const resultsRoot = join(repoRoot, 'bench/results')

  const results: SizeResult[] = []
  for (const size of options.sizes) {
    const fixture = createFixture(size)
    const sites = await writeSites(fixture, sitesRoot)
    log(`wrote ${size} guide pages into ${join(sitesRoot, String(size))}`)

    const measurements: [SiteKind, SiteMeasurement][] = []
    for (const kind of SITE_KINDS) {
      measurements.push([kind, await measureSite(sites[kind], {
        runs: options.runs,
        lighthouse: options.lighthouse,
        startPage: fixture.pages[0]!,
        targetPage: fixture.pages[1]!,
      })])
    }

    results.push({
      size,
      build: byKind(measurements.map(([kind, measurement]) => [kind, measurement.build] as const)),
      dev: byKind(measurements.map(([kind, measurement]) => [kind, measurement.dev] as const)),
      browser: byKind(measurements.map(([kind, measurement]) => [kind, measurement.browser] as const)),
      assets: byKind(measurements.map(([kind, measurement]) => [kind, measurement.assets] as const)),
      ...(options.lighthouse
        ? {
            lighthouse: byKind(measurements.map(([kind, measurement]) => [kind, measurement.lighthouse!] as const)),
          }
        : {}),
    })
  }

  const report: BenchReport = {
    generatedAt: new Date().toISOString(),
    environment: readEnvironment(),
    tools: readToolVersions({ repoRoot, lighthouse: options.lighthouse }),
    settings: {
      sizes: options.sizes,
      runs: options.runs,
      lighthouse: options.lighthouse,
    },
    results,
  }

  const markdown = formatReport(report)
  consola.log(`\n${markdown}`)

  await mkdir(resultsRoot, { recursive: true })
  const baseName = reportFileBaseName(report)
  const markdownPath = join(resultsRoot, `${baseName}.md`)
  const jsonPath = join(resultsRoot, `${baseName}.json`)
  await writeFile(markdownPath, markdown)
  await writeFile(jsonPath, formatReportJson(report))
  log(`wrote ${markdownPath}`)
  log(`wrote ${jsonPath}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

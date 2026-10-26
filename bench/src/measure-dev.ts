import type { Browser, BrowserContext, Page } from 'playwright'
import type { SitePaths } from './sites.ts'
import { setTimeout as delay } from 'node:timers/promises'
import { launchBrowser } from './browser.ts'
import { clearCaches, SITE_LABELS } from './sites.ts'
import {
  formatCommand,
  isPortFree,
  spawnDetached,
  waitForListeningUrl,
  waitForPortRelease,
} from './spawn.ts'

/** A 2000 page dev server may need a while before its home page is visible. */
const DEV_TIMEOUT_MS = 10 * 60 * 1000
/** How often the browser retries when a navigation is refused or aborted. */
const RETRY_INTERVAL_MS = 50

export interface DevRunMeasurement {
  /** Milliseconds from spawning the dev command until the home page heading is visible. */
  contentVisibleMs: number
  /** Milliseconds from spawning the dev command until the first HTML response for `/`. */
  firstHtmlMs: number
}

export interface DevMeasureOptions {
  runs: number
  /** Heading text the home page has to show before a run counts as ready. */
  expectHeading: string
  timeoutMs?: number
  onRun?: (info: { run: number } & DevRunMeasurement) => void
}

/**
 * Measure how long a dev server needs from spawn until its home page is readable.
 *
 * Ready means a headless browser has the home page heading on screen. VitePress dev
 * answers with an empty shell and renders in the browser, while KawaPress dev answers
 * with the server rendered page, so only the visible heading compares the two fairly.
 * The first HTML response is recorded on the same page load, which keeps the older
 * metric without a second request that would warm the server for the browser run.
 *
 * The caches are removed before every run, so each run starts from a cold state, and
 * every run gets a fresh browser context so no HTTP cache survives between runs.
 * Build output is left untouched because size measurement reads it afterwards.
 */
export async function measureDevReady(
  site: SitePaths,
  options: DevMeasureOptions,
): Promise<DevRunMeasurement[]> {
  const measurements: DevRunMeasurement[] = []
  const timeoutMs = options.timeoutMs ?? DEV_TIMEOUT_MS
  const browser = await launchBrowser()

  try {
    for (let run = 1; run <= options.runs; run++) {
      if (!(await isPortFree(site.devPort))) {
        throw new Error(
          `Benchmark: port ${site.devPort} is already in use before starting \`${formatCommand(site.devCommand)}\`. `
          + `Stop the process that holds it (\`lsof -ti :${site.devPort} | xargs kill -9\`) and run the benchmark again.`,
        )
      }

      await clearCaches(site)
      const measurement = await measureRun(browser, site, options.expectHeading, timeoutMs)
      measurements.push(measurement)
      options.onRun?.({ run, ...measurement })
    }
  }
  finally {
    await browser.close()
  }

  return measurements
}

async function measureRun(
  browser: Browser,
  site: SitePaths,
  expectHeading: string,
  timeoutMs: number,
): Promise<DevRunMeasurement> {
  // A fresh context per run keeps no HTTP cache, so every run starts cold.
  const context = await browser.newContext()
  const startedAt = performance.now()
  const server = spawnDetached(site.devCommand, { cwd: site.root })

  try {
    const deadline = startedAt + timeoutMs
    const firstHtmlMs = await openVisibleHomePage(context, site.devPort, {
      startedAt,
      expectHeading,
      deadline,
      timeoutMs,
    })
    const contentVisibleMs = performance.now() - startedAt
    if (firstHtmlMs === undefined) {
      throw new Error(
        `Benchmark: ${SITE_LABELS[site.kind]} showed the home page without a single HTML response. `
        + 'The benchmark records the first document response of the same page load, so the dev server has to answer `/`.',
      )
    }
    return { contentVisibleMs, firstHtmlMs }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${message}\n  server output:\n${indent(server.output())}`)
  }
  finally {
    await server.stop()
    await waitForPortRelease(site.devPort)
    await context.close()
  }
}

interface OpenOptions {
  /** `performance.now()` value at which the dev command was spawned. */
  startedAt: number
  expectHeading: string
  /** Absolute `performance.now()` value after which the run fails. */
  deadline: number
  timeoutMs: number
}

/**
 * Navigate a fresh page until the home page heading is visible.
 *
 * @returns milliseconds from the spawn to the first HTML response, `undefined` when the
 * page became visible without a document response the benchmark could see.
 */
async function openVisibleHomePage(
  context: BrowserContext,
  port: number,
  options: OpenOptions,
): Promise<number | undefined> {
  let lastAttempt = 'no attempt yet'

  while (performance.now() < options.deadline) {
    const url = await waitForListeningUrl(port, { timeoutMs: remainingMs(options.deadline) })
    const page = await context.newPage()
    let firstHtmlMs: number | undefined
    page.on('response', (response) => {
      if (firstHtmlMs !== undefined || response.request().resourceType() !== 'document') {
        return
      }
      const contentType = response.headers()['content-type'] ?? ''
      if (!response.ok() || !contentType.includes('text/html')) {
        return
      }
      firstHtmlMs = performance.now() - options.startedAt
    })

    try {
      // `commit` resolves as soon as the response starts arriving; the page keeps loading
      // in the background, which the heading check below waits for.
      await page.goto(url, { waitUntil: 'commit', timeout: remainingMs(options.deadline) })
    }
    catch (error) {
      lastAttempt = `${url}: ${firstLine(error)}`
      // A failed navigation leaves Chromium on an error page that aborts the next
      // navigation of the same page, so the attempt continues on a new page.
      await page.close()
      await delay(RETRY_INTERVAL_MS)
      continue
    }

    await expectHeading(page, url, options)
    return firstHtmlMs
  }

  throw new Error(
    `Benchmark: the dev server did not stay reachable long enough to paint the home page `
    + `within ${options.timeoutMs}ms. Last attempt: ${lastAttempt}`,
  )
}

async function expectHeading(page: Page, url: string, options: OpenOptions): Promise<void> {
  const heading = page.locator('h1').first()
  try {
    await heading.waitFor({ state: 'visible', timeout: remainingMs(options.deadline) })
  }
  catch (error) {
    throw new Error(
      `${url} answered, but no visible \`h1\` appeared before the ${options.timeoutMs}ms budget ran out. `
      + `Last browser error: ${firstLine(error)}`,
    )
  }

  const text = (await heading.textContent() ?? '').trim()
  if (!text.includes(options.expectHeading)) {
    throw new Error(
      `${url} answered, but the home page heading reads \`${text}\` instead of containing \`${options.expectHeading}\`. `
      + 'The fixture home page and the themes disagree; update bench/src/fixture.ts and the themes together.',
    )
  }
}

/** Milliseconds left until `deadline`, never below one so Playwright gets a valid timeout. */
function remainingMs(deadline: number): number {
  return Math.max(1, Math.ceil(deadline - performance.now()))
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.split('\n')[0] ?? message
}

function indent(text: string): string {
  const lines = text.trim().split('\n').slice(-20)
  return lines.map(line => `    ${line}`).join('\n')
}

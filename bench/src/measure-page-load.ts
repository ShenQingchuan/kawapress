import type { BrowserContext, Page } from 'playwright'
import type { SitePaths } from './sites.ts'
import { launchBrowser } from './browser.ts'
import {
  formatCommand,
  isPortFree,
  loopbackUrls,
  spawnDetached,
  waitForFirstHtml,
  waitForPortRelease,
} from './spawn.ts'

/** Preview servers of the other measurements may still be shutting down. */
const PREVIEW_TIMEOUT_MS = 2 * 60 * 1000
/** A page that never reports its mount or its next page fails the run. */
const PAGE_TIMEOUT_MS = 60 * 1000

export interface PageLoadRuns {
  /** Milliseconds from document navigation start until Vue mounted the app. */
  hydrationMs: number
  /** Milliseconds from clicking a sidebar link until the target page heading is visible. */
  clientNavigationMs: number
}

export interface MeasurePageLoadOptions {
  /** How often the pair of measurements is repeated. */
  runs: number
  /** Route a run starts on. */
  startRoute: string
  /** Route the sidebar link of the site points at. */
  targetRoute: string
  /** Heading the target page has to show before the navigation counts as done. */
  expectHeading: string
  /** Site base, for example `/`. */
  base: string
  onRun?: (info: { run: number } & PageLoadRuns) => void
}

/** What the page records about its own load, read back once the browser is done. */
interface BrowserMarks {
  hydrationMs?: number
  clientNavigation?: { done?: boolean, ms?: number }
}

/**
 * Measure the two numbers a reader feels on the built site: how long the app needs
 * to take over the served HTML, and how long a click on a sidebar link takes to show
 * the next page.
 *
 * "App mounted" is Vue's own mark: `app.mount()` sets `__vue_app__` on the container
 * right after the first render, and it does so in KawaPress and in VitePress alike.
 * The page polls for it per animation frame, so no output of either tool is patched
 * and both numbers are measured the same way, with the same one-frame resolution.
 *
 * The site is served by the tool's own preview command, and every run gets a fresh
 * browser context so no HTTP cache survives between runs.
 */
export async function measurePageLoads(
  site: SitePaths,
  options: MeasurePageLoadOptions,
): Promise<PageLoadRuns[]> {
  if (!(await isPortFree(site.previewPort))) {
    throw new Error(
      `Benchmark: port ${site.previewPort} is already in use before starting \`${formatCommand(site.previewCommand)}\`. `
      + `Stop the process that holds it (\`lsof -ti :${site.previewPort} | xargs kill -9\`) and run the benchmark again.`,
    )
  }

  const browser = await launchBrowser()
  const server = spawnDetached(site.previewCommand, { cwd: site.root })
  try {
    // The preview command prints no URL, so the working loopback origin is the
    // one that answers the start route with an HTML document.
    const startUrl = await waitForFirstHtml(
      loopbackUrls(site.previewPort, routePath(options.base, options.startRoute)),
      { timeoutMs: PREVIEW_TIMEOUT_MS },
    )
    const origin = new URL(startUrl).origin

    const measurements: PageLoadRuns[] = []
    for (let run = 1; run <= options.runs; run++) {
      const context = await browser.newContext()
      try {
        const measurement = await measureRun(context, origin, options)
        measurements.push(measurement)
        options.onRun?.({ run, ...measurement })
      }
      finally {
        await context.close()
      }
    }
    return measurements
  }
  finally {
    await server.stop()
    await waitForPortRelease(site.previewPort)
    await browser.close()
  }
}

async function measureRun(
  context: BrowserContext,
  origin: string,
  options: MeasurePageLoadOptions,
): Promise<PageLoadRuns> {
  const page = await context.newPage()
  await page.addInitScript(() => {
    const marks: BrowserMarks = {}
    ;(window as unknown as { __bench: BrowserMarks }).__bench = marks
    const record = (): void => {
      const container = document.querySelector('#app')
      if (container && (container as { __vue_app__?: unknown }).__vue_app__ !== undefined) {
        marks.hydrationMs = performance.now()
        return
      }
      requestAnimationFrame(record)
    }
    record()
  })

  await page.goto(`${origin}${routePath(options.base, options.startRoute)}`, {
    waitUntil: 'commit',
    timeout: PAGE_TIMEOUT_MS,
  })
  await page.waitForFunction(
    () => (window as unknown as { __bench?: BrowserMarks }).__bench?.hydrationMs !== undefined,
    undefined,
    { timeout: PAGE_TIMEOUT_MS },
  )
  const hydrationMs = await readHydrationMs(page)

  await clickSidebarLink(page, options)
  const clientNavigationMs = await readClientNavigationMs(page)

  await page.close()
  return { hydrationMs, clientNavigationMs }
}

/**
 * Click the sidebar link of the target page and record how long the page needs
 * until the new heading is on screen. The heading check runs in the page per
 * animation frame, so the time is the reader's time and not a polling interval
 * of the benchmark.
 */
async function clickSidebarLink(page: Page, options: MeasurePageLoadOptions): Promise<void> {
  await page.evaluate(({ route, heading }) => {
    const marks = (window as unknown as { __bench: BrowserMarks }).__bench
    // VitePress writes the `.html` file name into its links, KawaPress the route
    // alone, so a link matches when its path is the route, with or without it.
    const pathOf = (href: string): string => (href.split(/[?#]/)[0] ?? '')
      .replace(/\.html$/, '')
    const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
      .find(anchor => pathOf(anchor.getAttribute('href') ?? anchor.href).endsWith(route))

    if (!link) {
      throw new Error(`no anchor points at ${route}`)
    }

    marks.clientNavigation = {}
    const startedAt = performance.now()
    const check = (): void => {
      const title = document.querySelector('h1')?.textContent ?? ''
      if (title.includes(heading)) {
        marks.clientNavigation = { done: true, ms: performance.now() - startedAt }
        return
      }
      requestAnimationFrame(check)
    }

    link.click()
    check()
  }, { route: options.targetRoute, heading: options.expectHeading })

  await page.waitForFunction(
    () => (window as unknown as { __bench?: BrowserMarks }).__bench?.clientNavigation?.done === true,
    undefined,
    { timeout: PAGE_TIMEOUT_MS },
  )
}

async function readHydrationMs(page: Page): Promise<number> {
  const marks = await page.evaluate(
    () => (window as unknown as { __bench: BrowserMarks }).__bench.hydrationMs,
  )
  if (marks === undefined) {
    throw new Error('Benchmark: the page never reported its mounted app.')
  }
  return marks
}

async function readClientNavigationMs(page: Page): Promise<number> {
  const ms = await page.evaluate(
    () => (window as unknown as { __bench: BrowserMarks }).__bench.clientNavigation?.ms,
  )
  if (ms === undefined) {
    throw new Error('Benchmark: the page never reported the client navigation.')
  }
  return ms
}

/** Path of a route inside the site base, mirroring how both tools apply `base`. */
function routePath(base: string, route: string): string {
  const normalizedBase = `/${base.split('/').filter(Boolean).join('/')}`
  const prefix = normalizedBase === '/' ? '' : normalizedBase
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  return `${prefix}${normalizedRoute}`
}

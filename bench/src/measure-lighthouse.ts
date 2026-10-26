import type { SitePaths } from './sites.ts'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import {
  formatCommand,
  isPortFree,
  loopbackUrls,
  spawnDetached,
  waitForFirstHtml,
  waitForPortRelease,
} from './spawn.ts'

export interface LighthouseScore {
  performance: number
  accessibility: number
}

/** Lighthouse desktop preset: no mobile throttling, desktop viewport. */
const DESKTOP_SETTINGS = {
  formFactor: 'desktop',
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
  throttling: {
    rttMs: 40,
    throughputKbps: 10_240,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0,
  },
}

const PREVIEW_TIMEOUT_MS = 2 * 60 * 1000

/**
 * Serve the built site with the tool's own preview command and score the home page.
 *
 * Only used when `--lighthouse` is passed, because a Lighthouse run needs Chrome and
 * takes a lot longer than the other measurements.
 */
export async function measureLighthouse(site: SitePaths): Promise<LighthouseScore> {
  if (!(await isPortFree(site.previewPort))) {
    throw new Error(
      `Benchmark: port ${site.previewPort} is already in use before starting \`${formatCommand(site.previewCommand)}\`. `
      + `Stop the process that holds it (\`lsof -ti :${site.previewPort} | xargs kill -9\`) and run the benchmark again.`,
    )
  }

  const server = spawnDetached(site.previewCommand, { cwd: site.root })
  try {
    const url = await waitForFirstHtml(loopbackUrls(site.previewPort), {
      timeoutMs: PREVIEW_TIMEOUT_MS,
    })
    const chrome = await launch({
      chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
      logLevel: 'error',
    })
    try {
      const run = await lighthouse(url, {
        ...DESKTOP_SETTINGS,
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility'],
      })
      if (!run) {
        throw new Error(`Benchmark: Lighthouse returned no result for ${url}`)
      }
      return {
        performance: readCategoryScore(run.lhr.categories, 'performance', url),
        accessibility: readCategoryScore(run.lhr.categories, 'accessibility', url),
      }
    }
    finally {
      await chrome.kill()
    }
  }
  finally {
    await server.stop()
    await waitForPortRelease(site.previewPort)
  }
}

function readCategoryScore(
  categories: Record<string, { score: number | null } | undefined>,
  category: string,
  url: string,
): number {
  const score = categories[category]?.score
  if (score === null || score === undefined) {
    throw new Error(
      `Benchmark: Lighthouse reported no ${category} score for ${url}. Run the benchmark again, or check that Chrome starts with \`lighthouse\` on this machine.`,
    )
  }
  return Math.round(score * 100)
}

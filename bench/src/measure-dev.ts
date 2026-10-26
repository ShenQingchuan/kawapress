import type { SitePaths } from './sites.ts'
import { clearCaches } from './sites.ts'
import {
  formatCommand,
  isPortFree,
  loopbackUrls,
  spawnDetached,
  waitForFirstHtml,
  waitForPortRelease,
} from './spawn.ts'

/** A 2000 page dev server may need a while before it answers the first request. */
const DEV_TIMEOUT_MS = 10 * 60 * 1000

export interface DevMeasureOptions {
  runs: number
  timeoutMs?: number
  onRun?: (info: { run: number, durationMs: number }) => void
}

/**
 * Measure how long a dev server needs from spawn to the first HTML response.
 *
 * The caches are removed before every run, so each run starts from a cold state.
 * Build output is left untouched because size measurement reads it afterwards.
 *
 * @returns duration of every run in milliseconds.
 */
export async function measureDevReady(
  site: SitePaths,
  options: DevMeasureOptions,
): Promise<number[]> {
  const durations: number[] = []
  const urls = loopbackUrls(site.devPort)

  for (let run = 1; run <= options.runs; run++) {
    if (!(await isPortFree(site.devPort))) {
      throw new Error(
        `Benchmark: port ${site.devPort} is already in use before starting \`${formatCommand(site.devCommand)}\`. `
        + `Stop the process that holds it (\`lsof -ti :${site.devPort} | xargs kill -9\`) and run the benchmark again.`,
      )
    }

    await clearCaches(site)
    const server = spawnDetached(site.devCommand, { cwd: site.root })
    const startedAt = performance.now()
    try {
      await waitForFirstHtml(urls, { timeoutMs: options.timeoutMs ?? DEV_TIMEOUT_MS })
      const durationMs = performance.now() - startedAt
      durations.push(durationMs)
      options.onRun?.({ run, durationMs })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`${message}\n  server output:\n${indent(server.output())}`)
    }
    finally {
      await server.stop()
      await waitForPortRelease(site.devPort)
    }
  }

  return durations
}

function indent(text: string): string {
  const lines = text.trim().split('\n').slice(-20)
  return lines.map(line => `    ${line}`).join('\n')
}

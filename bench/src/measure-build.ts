import type { SitePaths } from './sites.ts'
import { clearBuildState } from './sites.ts'
import { runCommand } from './spawn.ts'

/** A build of 2000 pages can take several minutes on a slow machine. */
const BUILD_TIMEOUT_MS = 30 * 60 * 1000

export interface ColdBuildOptions {
  runs: number
  timeoutMs?: number
  onRun?: (info: { run: number, durationMs: number }) => void
}

/**
 * Measure cold build time: build output and caches are removed before every run.
 *
 * @returns duration of every run in milliseconds.
 */
export async function measureColdBuild(
  site: SitePaths,
  options: ColdBuildOptions,
): Promise<number[]> {
  const durations: number[] = []
  for (let run = 1; run <= options.runs; run++) {
    await clearBuildState(site)
    const result = await runCommand(site.buildCommand, {
      cwd: site.root,
      timeoutMs: options.timeoutMs ?? BUILD_TIMEOUT_MS,
    })
    durations.push(result.durationMs)
    options.onRun?.({ run, durationMs: result.durationMs })
  }
  return durations
}

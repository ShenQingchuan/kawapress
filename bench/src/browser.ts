import type { Browser } from 'playwright'
import { chromium } from 'playwright'

/** Commands that download the Chromium build the benchmark drives. */
const INSTALL_COMMAND = 'pnpm --dir bench exec playwright install chromium'
const INSTALL_COMMAND_IN_BENCH = 'pnpm exec playwright install chromium'

/**
 * Start the headless Chromium the benchmark uses to decide when a page is visible.
 *
 * The browser is started once and reused for every run, so its startup cost never
 * lands inside a measurement. Playwright downloads no browser on its own, so a
 * missing build is reported with the command that fixes it.
 */
export async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true })
  }
  catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error)
    throw new Error(
      `Benchmark: could not start Playwright Chromium (${reason}).\n`
      + `  Install it once with \`${INSTALL_COMMAND}\`, or run \`${INSTALL_COMMAND_IN_BENCH}\` inside \`bench/\`. `
      + 'Then run the benchmark again.',
    )
  }
}

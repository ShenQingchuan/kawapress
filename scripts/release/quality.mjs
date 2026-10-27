/** Repository-wide quality gates that run before a dry-run or a real publish. */

import { logStep, logSuccess, run } from './runtime.mjs'

export async function runQualityChecks() {
  logStep('Running quality checks')
  const checks = [
    ['pnpm', ['lint']],
    ['pnpm', ['typecheck']],
    ['pnpm', ['test']],
    ['pnpm', ['build']],
  ]

  for (const [command, args] of checks)
    await run(command, args)

  logSuccess('lint, typecheck, test, and docs build passed')
}

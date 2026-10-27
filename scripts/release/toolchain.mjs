/** Toolchain gates: Node, pnpm, and (in CI) an npm CLI that can do trusted publishing. */

import { join } from 'node:path'
import process from 'node:process'

import { rootDir } from './constants.mjs'
import { logSuccess, readJson, run } from './runtime.mjs'
import { compareSemver, parseSemver } from './semver.mjs'

export async function checkToolchain() {
  const rootManifest = await readJson(join(rootDir, 'package.json'))
  const expectedPnpm = rootManifest.packageManager?.match(/^pnpm@(.+)$/)?.[1]
  if (!expectedPnpm)
    throw new Error('The root package.json must pin pnpm in packageManager.')

  const currentNode = parseSemver(`${process.versions.node.split('.').slice(0, 3).join('.')}`)
  if (compareSemver(currentNode, parseSemver('22.12.0')) < 0)
    throw new Error(`Node.js 22.12 or newer is required. Current: ${process.version}`)

  const { stdout } = await run('pnpm', ['--version'], { capture: true })
  const currentPnpm = stdout.trim()
  if (currentPnpm !== expectedPnpm)
    throw new Error(`pnpm ${expectedPnpm} is required. Current: ${currentPnpm}`)

  logSuccess(`Toolchain: Node ${process.versions.node}, pnpm ${currentPnpm}`)
}

/** npm mints the OIDC publishing token itself, so the CLI must be new enough. */
export async function checkNpmVersion(minimum) {
  const { stdout } = await run('npm', ['--version'], { capture: true })
  const current = stdout.trim()
  if (compareSemver(parseSemver(current), parseSemver(minimum)) < 0) {
    throw new Error(
      `npm ${minimum} or newer is required for trusted publishing. Current: npm ${current}.\nRun: npm install -g npm@${minimum}`,
    )
  }

  logSuccess(`npm CLI: ${current}`)
}

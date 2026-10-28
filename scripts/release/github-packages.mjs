/** Mirrors the scoped packages to the GitHub npm registry so the repository page lists them. */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { githubPackagesRegistry } from './constants.mjs'
import { logStep, logSuccess, run } from './runtime.mjs'

/** GitHub only accepts packages whose scope equals the owner, so unscoped packages are left out. */
export function selectGitHubPackages(packages) {
  return packages.filter(packageInfo => packageInfo.name.startsWith('@kawapress/'))
}

/** `npm publish` arguments for one tarball; GitHub has no provenance support. */
export function githubPublishArgs(packageInfo, userConfig) {
  return [
    'publish',
    packageInfo.path,
    '--registry',
    githubPackagesRegistry,
    '--userconfig',
    userConfig,
    '--tag',
    packageInfo.tag,
    '--provenance=false',
  ]
}

/** GitHub answers a publish of an existing version with 409, which a re-run must tolerate. */
export function isAlreadyPublished(result) {
  return /409|cannot publish over|already exists/i.test(`${result.stderr}${result.stdout}`)
}

/**
 * Publishes the tarballs that npm just received. Versions GitHub already has are skipped,
 * so re-running a failed release is safe.
 */
export async function publishToGitHubPackages(packages, token) {
  const targets = selectGitHubPackages(packages)
  logStep(`Publishing ${targets.length} scoped package(s) to GitHub Packages`)

  const configDir = await mkdtemp(join(tmpdir(), 'kawapress-gh-packages-'))
  const userConfig = join(configDir, 'npmrc')
  try {
    await writeFile(userConfig, `//npm.pkg.github.com/:_authToken=\${GITHUB_PACKAGES_TOKEN}\n`)
    const env = { ...process.env, GITHUB_PACKAGES_TOKEN: token }

    for (const packageInfo of targets) {
      const result = await run('npm', githubPublishArgs(packageInfo, userConfig), {
        allowFailure: true,
        capture: true,
        env,
      })
      if (result.exitCode === 0)
        logSuccess(`${packageInfo.name}@${packageInfo.version} (GitHub Packages)`)
      else if (isAlreadyPublished(result))
        logSuccess(`${packageInfo.name}@${packageInfo.version} (already on GitHub Packages, skipped)`)
      else
        throw new Error(`GitHub Packages rejected ${packageInfo.name}@${packageInfo.version}:\n${result.stderr.trim()}`)
    }
  }
  finally {
    await rm(configDir, { force: true, recursive: true })
  }
}

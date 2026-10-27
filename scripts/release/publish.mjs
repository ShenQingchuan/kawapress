/** Publish ordering, the dry-run simulation, confirmation, and the real publish loop. */

import process from 'node:process'
import { createInterface } from 'node:readline/promises'

import { ensureDistTag, waitForDistTag, waitForPublishedIntegrity } from './registry.mjs'
import { logStep, logSuccess, logWarning, run } from './runtime.mjs'

/** Topological order over internal production dependencies, ties broken by name. */
export function sortForPublish(packages) {
  const names = new Set(packages.map(packageInfo => packageInfo.name))
  const dependencies = new Map(packages.map((packageInfo) => {
    const internalDependencies = new Set()
    for (const field of ['dependencies', 'optionalDependencies']) {
      for (const dependency of Object.keys(packageInfo.manifest[field] ?? {})) {
        if (names.has(dependency))
          internalDependencies.add(dependency)
      }
    }
    return [packageInfo.name, internalDependencies]
  }))
  const packageByName = new Map(packages.map(packageInfo => [packageInfo.name, packageInfo]))
  const sorted = []

  while (dependencies.size > 0) {
    const ready = [...dependencies.entries()]
      .filter(([, packageDependencies]) => packageDependencies.size === 0)
      .map(([name]) => name)
      .sort()

    if (ready.length === 0) {
      const cycle = [...dependencies.keys()].sort().join(', ')
      throw new Error(`Production dependency cycle between packages: ${cycle}`)
    }

    for (const name of ready) {
      sorted.push(packageByName.get(name))
      dependencies.delete(name)
      for (const packageDependencies of dependencies.values())
        packageDependencies.delete(name)
    }
  }

  return sorted
}

/** Keeps only the packages a bootstrap run has to publish (`targets` is a name set). */
export function filterPublishOrder(publishOrder, targets) {
  if (!targets)
    return publishOrder
  return publishOrder.filter(packageInfo => targets.has(packageInfo.name))
}

export async function dryRunPublish(packages, options) {
  logStep(`Simulating npm publish with dist-tag ${options.tag}`)

  for (const packageInfo of packages) {
    await run('npm', [
      'publish',
      packageInfo.path,
      '--dry-run',
      '--access',
      'public',
      '--tag',
      options.tag,
      '--registry',
      options.registry,
      '--json',
    ], { capture: true })
    logSuccess(`${packageInfo.name}@${packageInfo.version}`)
  }
}

export async function confirmPublish(options, packages, states) {
  if (options.yes)
    return
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error('Publish mode needs an interactive terminal or the explicit --yes flag.')

  const pending = packages.filter(packageInfo => states.get(packageInfo.name) === 'available')
  console.log(`\nThis will publish ${pending.length} package(s) as ${options.version} with dist-tag ${options.tag}.`)
  const readline = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await readline.question(`Type ${options.version} to continue: `)
  readline.close()

  if (answer.trim() !== options.version)
    throw new Error('Release cancelled.')
}

/** Publishes whatever is still `available`; identical packages only get their dist-tag checked. */
export async function publishPackages(packages, states, options) {
  logStep(`Publishing to npm with dist-tag ${options.tag}`)

  for (const packageInfo of packages) {
    if (states.get(packageInfo.name) === 'available') {
      await run('npm', [
        'publish',
        packageInfo.path,
        '--access',
        'public',
        '--tag',
        options.tag,
        '--registry',
        options.registry,
      ])

      const integrityVerified = await waitForPublishedIntegrity(packageInfo, options.registry)
      if (!integrityVerified) {
        logWarning(
          `${packageInfo.name}@${packageInfo.version} was accepted by npm; package metadata is still propagating.`,
        )
      }
    }
    else {
      await ensureDistTag(packageInfo, options.tag, options.registry)
    }
  }

  // npm publish 已通过 --tag 设置标签；registry 同步较慢，统一并发等待。
  logStep('Waiting for the registry to report dist-tags')
  await Promise.all(packages.map(packageInfo => waitForDistTag(packageInfo, options.tag, options.registry)))

  for (const packageInfo of packages) {
    const state = states.get(packageInfo.name)
    const resumed = state === 'identical'
      ? ' (resumed)'
      : state === 'pending'
        ? ' (resumed; npm metadata pending)'
        : ''
    logSuccess(`${packageInfo.name}@${packageInfo.version}${resumed}`)
  }
}

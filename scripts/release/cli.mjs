/** Command line parsing for the release helper. */

import { defaultRegistry } from './constants.mjs'

/** Every mode is exclusive: a run either prepares, checks, publishes, or bootstraps. */
const modeFlags = new Map([
  ['--dry-run', 'dry-run'],
  ['--publish', 'publish'],
  ['--bootstrap', 'bootstrap'],
  ['--prepare', 'prepare'],
])

export function printUsage() {
  console.log(`KawaPress release helper

Usage:
  pnpm release --version <semver> [--dry-run]
  pnpm release --version <semver> --publish [--yes]
  pnpm release:prepare --version <semver>
  pnpm release --bootstrap --version <semver> [--yes]

Modes:
  (default)               Pack and validate without publishing
  --dry-run               Same as the default mode
  --publish               Publish the validated tarballs
  --prepare               Only rewrite the version of every public package.json
  --bootstrap             Publish the packages that are missing from npm, then
                          print the npm trusted publisher commands

Options:
  --version, -v <semver>  Version shared by every public package
  --tag <tag>             npm dist-tag (default: prerelease name or latest)
  --registry <url>        Registry (default: ${defaultRegistry})
  --yes                   Skip the typed confirmation in publish/bootstrap modes
  --help, -h              Show this help

In GitHub Actions the helper switches to CI mode on its own: npm authentication
comes from the OIDC token, the release version must already be committed, and the
working tree is never modified.

Examples:
  pnpm release:prepare --version 0.1.0
  pnpm release --version 0.1.0 --dry-run
  pnpm release --version 0.0.1 --bootstrap
  pnpm release --version 0.1.0 --publish
`)
}

export function parseArguments(argv) {
  const options = {
    help: false,
    mode: 'dry-run',
    registry: defaultRegistry,
    tag: undefined,
    tagProvided: false,
    version: undefined,
    yes: false,
  }
  let selectedMode

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }

    if (argument === '--yes') {
      options.yes = true
      continue
    }

    const mode = modeFlags.get(argument)
    if (mode) {
      if (selectedMode)
        throw new Error(`Choose only one of ${[...modeFlags.keys()].join(', ')}.`)
      selectedMode = mode
      options.mode = mode
      continue
    }

    const valueOptions = new Map([
      ['--version', 'version'],
      ['-v', 'version'],
      ['--tag', 'tag'],
      ['--registry', 'registry'],
    ])
    const key = valueOptions.get(argument)
    if (key) {
      const value = argv[index + 1]
      if (!value || value.startsWith('-'))
        throw new Error(`${argument} needs a value.`)
      options[key] = value
      if (key === 'tag')
        options.tagProvided = true
      index += 1
      continue
    }

    if (!argument.startsWith('-') && !options.version) {
      options.version = argument
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  options.registry = normalizeRegistry(options.registry)
  return options
}

export function normalizeRegistry(registry) {
  let url
  try {
    url = new URL(registry)
  }
  catch {
    throw new Error(`Invalid registry URL: ${registry}`)
  }

  if (url.protocol !== 'https:')
    throw new Error('The release registry must use HTTPS.')

  return url.href.endsWith('/') ? url.href : `${url.href}/`
}

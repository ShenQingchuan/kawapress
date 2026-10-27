/** Minimal reader for the named pnpm catalogs, so packed ranges can be verified. */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { rootDir } from './constants.mjs'

export function unquoteYamlScalar(value) {
  const trimmed = value.trim()
  const quote = trimmed[0]
  if ((quote === '\'' || quote === '"') && trimmed.endsWith(quote))
    return trimmed.slice(1, -1)
  return trimmed
}

/** `catalog:` specifier → the concrete range declared in pnpm-workspace.yaml. */
export async function readCatalogs() {
  const workspace = await readFile(join(rootDir, 'pnpm-workspace.yaml'), 'utf8')
  const catalogs = new Map()
  let currentCatalog
  let insideCatalogs = false

  for (const line of workspace.split(/\r?\n/)) {
    if (!insideCatalogs) {
      if (line.trim() === 'catalogs:')
        insideCatalogs = true
      continue
    }

    if (line.trim() === '')
      continue
    if (!line.startsWith('  '))
      break

    const catalogMatch = /^ {2}([\w.-]+):\s*$/.exec(line)
    if (catalogMatch) {
      currentCatalog = catalogMatch[1]
      catalogs.set(currentCatalog, new Map())
      continue
    }

    const entryMatch = /^ {4}('[^']+'|"[^"]+"|[^:]+): (.+)$/.exec(line)
    if (!entryMatch || !currentCatalog)
      throw new Error(`Could not parse catalog line in pnpm-workspace.yaml: ${line}`)

    catalogs.get(currentCatalog).set(
      unquoteYamlScalar(entryMatch[1]),
      unquoteYamlScalar(entryMatch[2]),
    )
  }

  if (catalogs.size === 0)
    throw new Error('No named pnpm catalogs were found.')

  return catalogs
}

export function expectedCatalogRange(catalogs, dependency, specifier) {
  const catalogName = specifier.slice('catalog:'.length)
  const expected = catalogs.get(catalogName)?.get(dependency)
  if (!expected)
    throw new Error(`Cannot resolve ${dependency} from named catalog ${catalogName || '(default)'}.`)
  return expected
}

/** `workspace:` specifier → the range pnpm writes into the tarball, given the version of the package it points at. */
export function expectedWorkspaceRange(specifier, version) {
  if (specifier === 'workspace:*')
    return version
  if (specifier === 'workspace:^')
    return `^${version}`
  if (specifier === 'workspace:~')
    return `~${version}`
  return specifier.replace(/^workspace:/, '')
}
